import re
import logging
from typing import TypedDict, Optional, Union, List
from datetime import datetime
import time

import requests
from playwright.sync_api import sync_playwright, Playwright, Browser, Page, Response
import fitz # PyMuPDF

# Configure logger (equivalent to your ../utils/logger)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class VerifyResult(TypedDict):
    success: bool
    payer: Optional[str]
    payer_account: Optional[str] # Python uses snake_case
    receiver: Optional[str]
    receiver_account: Optional[str]
    amount: Optional[float]
    date: Optional[datetime]
    reference: Optional[str]
    reason: Optional[str]
    error: Optional[str]

def title_case(s: str) -> str:
    return s.lower().title()

def parse_cbe_receipt(pdf_buffer: bytes) -> VerifyResult:
    try:
        doc = fitz.open(stream=pdf_buffer, filetype="pdf")
        raw_text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            raw_text += page.get_text("text")
        doc.close()

        raw_text = ' '.join(raw_text.split()) # Normalize whitespace

        # Debug: Print raw text
        # logger.debug(f"Raw PDF Text: {raw_text[:500]}") # Print first 500 chars

        payer_name_match = re.search(r"Payer\s*:?\s*(.*?)\s+Account", raw_text, re.IGNORECASE)
        receiver_name_match = re.search(r"Receiver\s*:?\s*(.*?)\s+Account", raw_text, re.IGNORECASE)

        payer_name = title_case(payer_name_match.group(1).strip()) if payer_name_match else None
        receiver_name = title_case(receiver_name_match.group(1).strip()) if receiver_name_match else None

        # Account numbers: Find all, assume first is payer, second is receiver
        account_matches = re.findall(r"Account\s*:?\s*([A-Z0-9]?\*{4}\d{4})", raw_text, re.IGNORECASE)
        payer_account = account_matches[0] if len(account_matches) > 0 else None
        receiver_account = account_matches[1] if len(account_matches) > 1 else None

        reason_match = re.search(r"Reason\s*/\s*Type of service\s*:?\s*(.*?)\s+Transferred Amount", raw_text, re.IGNORECASE)
        reason = reason_match.group(1).strip() if reason_match else None

        amount_match = re.search(r"Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB", raw_text, re.IGNORECASE)
        amount_text = amount_match.group(1) if amount_match else None
        amount = float(amount_text.replace(',', '')) if amount_text else None

        reference_match = re.search(r"Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)", raw_text, re.IGNORECASE)
        reference = reference_match.group(1).strip() if reference_match else None
        
        # Date parsing needs to be robust. Assuming format like "DD/MM/YYYY, HH:MM AM/PM"
        # Example: "Payment Date & Time : 07/03/2024, 04:00 PM"
        date_raw_match = re.search(
            r"Payment Date & Time\s*:?\s*(\d{1,2}/\d{1,2}/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[APM]{2})",
            raw_text,
            re.IGNORECASE
        )
        date_raw = date_raw_match.group(1).strip() if date_raw_match else None
        transaction_date: Optional[datetime] = None
        if date_raw:
            # Attempt to parse with different common formats, including seconds
            # The visual format is M/D/Y, so try that first with seconds
            formats_to_try = [
                '%m/%d/%Y, %I:%M:%S %p',  
                '%d/%m/%Y, %I:%M:%S %p',  
                '%m/%d/%Y, %I:%M %p',    
                '%d/%m/%Y, %I:%M %p',    
            ]
            for fmt in formats_to_try:
                try:
                    transaction_date = datetime.strptime(date_raw, fmt)
                    break 
                except ValueError:
                    continue 
            
            if not transaction_date:
                logger.warning(f"Could not parse date string with any known format: {date_raw}")
        

        
        if payer_name and payer_account and receiver_name and receiver_account and amount is not None and transaction_date and reference:
            return VerifyResult(
                success=True,
                payer=payer_name,
                payer_account=payer_account,
                receiver=receiver_name,
                receiver_account=receiver_account,
                amount=amount,
                date=transaction_date,
                reference=reference,
                reason=reason,
                error=None
            )
        else:
            missing_fields = []
            if not payer_name: missing_fields.append("payer_name")
            if not payer_account: missing_fields.append("payer_account")
            if not receiver_name: missing_fields.append("receiver_name")
            if not receiver_account: missing_fields.append("receiver_account")
            if amount is None: missing_fields.append("amount")
            if not transaction_date: missing_fields.append("date")
            if not reference: missing_fields.append("reference")
            logger.error(f"Could not extract all required fields. Missing: {', '.join(missing_fields)}")
            logger.debug(f"Payer: {payer_name}, PAccount: {payer_account}, Receiver: {receiver_name}, RAccount: {receiver_account}, Amount: {amount}, Date: {transaction_date}, Ref: {reference}")
            return VerifyResult(success=False, error="Could not extract all required fields from PDF.")

    except Exception as parse_err:
        logger.error(f"❌ PDF parsing failed: {parse_err}", exc_info=True)
        return VerifyResult(success=False, error=f"Error parsing PDF data: {parse_err}")


def verify_cbe(reference_id_part: str, account_suffix: str) -> VerifyResult:
    full_id = f"{reference_id_part}{account_suffix}"
    url = f"https://apps.cbe.com.et:100/?id={full_id}"
    
    # Common headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/pdf,application/octet-stream,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    }

    try:
        logger.info(f"🔎 Attempting direct fetch: {url}")
        # verify=False is equivalent to rejectUnauthorized: false
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        content_type = response.headers.get('Content-Type', '').lower()
        if 'application/pdf' in content_type or 'application/octet-stream' in content_type:
            logger.info("✅ Direct fetch success, parsing PDF")
            try:
                with open("debug_fetched_receipt.pdf", "wb") as f:
                    f.write(response.content)
                logger.info("ℹ️ Saved fetched PDF to debug_fetched_receipt.pdf")
            except Exception as e:
                logger.error(f"Could not save debug PDF: {e}")
            return parse_cbe_receipt(response.content)
        else:
            logger.warning(f"⚠️ Direct fetch did not return PDF. Content-Type: {content_type}. Body starts with: {response.text[:200]}")
            # Fall through to Playwright if not a PDF
            raise requests.exceptions.RequestException("Direct fetch did not return a PDF.")

    except requests.exceptions.RequestException as direct_err:
        logger.warning(f"⚠️ Direct fetch failed: {direct_err}, falling back to Playwright.")

        detected_pdf_url_holder: List[Optional[str]] = [None] # Use a list to pass by reference to the handler

        def handle_response(response_obj: Response):
            content_type = response_obj.headers.get('content-type', '').lower()
            # CBE sometimes serves PDF as octet-stream or without proper content-type but ends with .pdf
            if 'pdf' in content_type or \
               'octet-stream' in content_type or \
               response_obj.url.lower().endswith(".pdf"):
                if detected_pdf_url_holder[0] is None: # Capture first PDF-like response
                    detected_pdf_url_holder[0] = response_obj.url
                    logger.info(f"🧾 PDF detected by Playwright: {detected_pdf_url_holder[0]}")

        playwright_instance: Optional[Playwright] = None
        browser: Optional[Browser] = None
        try:
            playwright_instance = sync_playwright().start()
            browser = playwright_instance.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ],
                ignore_https_errors=True # Equivalent to ignore-certificate-errors
            )
            # executable_path=os.environ.get("PLAYWRIGHT_EXECUTABLE_PATH") # If needed

            context = browser.new_context(
                user_agent=headers['User-Agent'],
                accept_downloads=True, 
                ignore_https_errors=True
            )
            page: Page = context.new_page()
            page.on("response", handle_response)
            
            logger.info(f"Navigating with Playwright to: {url}")
            page.goto(url, wait_until="domcontentloaded", timeout=20000) 
            
            time.sleep(10) 

            detected_pdf_url = detected_pdf_url_holder[0]

            if not detected_pdf_url:
                # Try to find an embed or iframe src if direct response wasn't caught
                try:
                    pdf_element = page.query_selector("embed[type='application/pdf'], iframe[src$='.pdf']")
                    if pdf_element:
                        src = pdf_element.get_attribute("src")
                        if src:
                             # Resolve relative URLs
                            detected_pdf_url = page.urljoin(src)
                            logger.info(f"🧾 PDF detected from embed/iframe: {detected_pdf_url}")
                except Exception as e_embed:
                    logger.warning(f"Could not find PDF in embed/iframe: {e_embed}")


            if not detected_pdf_url:
                if page.url.lower().endswith(".pdf") or \
                   ('pdf' in (page.context.pages[0].main_frame.url) or \
                   'pdf' in page.context.pages[0].content()):
                    logger.info(f"Current page URL seems to be a PDF: {page.url}")
                    detected_pdf_url = page.url

            if not detected_pdf_url:
                page_content_sample = page.content()[:500]
                logger.error(f"No PDF detected via Playwright. Final URL: {page.url}. Content sample: {page_content_sample}")
                return VerifyResult(success=False, error="No PDF detected via Playwright.")

            logger.info(f"Fetching PDF from detected URL: {detected_pdf_url}")
            
            if detected_pdf_url == page.url and ('application/pdf' in page.content() or page.content().startswith(b'%PDF')):
                 pdf_content = page.content()
            else:
                pdf_res = requests.get(detected_pdf_url, headers=headers, verify=False, timeout=30)
                pdf_res.raise_for_status()
                pdf_content = pdf_res.content

            return parse_cbe_receipt(pdf_content)

        except Exception as puppet_err:
            logger.error(f"❌ Playwright failed: {puppet_err}", exc_info=True)
            return VerifyResult(
                success=False,
                error=f"Both direct and Playwright failed. Playwright error: {puppet_err}"
            )
        finally:
            if browser:
                browser.close()
            if playwright_instance:
                playwright_instance.stop()


if __name__ == "__main__":
    print("CBE Verification Test Tool")
    print("--------------------------")

    while True:
        print("\nChoose an option:")
        print("1. Test full verification flow (provide reference and suffix from URL)")
        print("2. Test PDF parsing only (provide local PDF file path)")
        print("3. Exit")
        choice = input("Enter your choice (1-3): ")

        if choice == '1':
            print("\n--- Testing Full Verification Flow ---")
            print("From your CBE link (e.g., https://apps.cbe.com.et:100/?id=YOURFULLIDHERE),")
            print("you need to provide the 'reference_id_part' and 'account_suffix'.")
            print("For example, if id=ET12345678901, then reference_id_part could be ET123456789 and account_suffix 01.")

            ref_part = input("Enter the reference_id_part: ").strip()
            acc_suffix = input("Enter the account_suffix: ").strip()

            if not ref_part or not acc_suffix:
                print("Both reference part and suffix are required. Please try again.")
                continue

            print(f"Attempting to verify with reference: {ref_part}, suffix: {acc_suffix}")
            result = verify_cbe(ref_part, acc_suffix)

            print("\n--- Verification Result ---")
            if result['success']:
                print("Status: SUCCESS")
                print(f"  Payer: {result.get('payer')}")
                print(f"  Payer Account: {result.get('payer_account')}")
                print(f"  Receiver: {result.get('receiver')}")
                print(f"  Receiver Account: {result.get('receiver_account')}")
                print(f"  Amount: {result.get('amount')}")
                print(f"  Date: {result.get('date')}")
                print(f"  Reference: {result.get('reference')}")
                print(f"  Reason: {result.get('reason')}")
            else:
                print("Status: FAILED")
                print(f"  Error: {result.get('error')}")

        elif choice == '2':
            print("\n--- Testing PDF Parser Directly ---")
            pdf_path = input("Enter the full path to your local CBE PDF file: ").strip()
            try:
                with open(pdf_path, "rb") as f:
                    sample_pdf_bytes = f.read()
                
                parsed_result = parse_cbe_receipt(sample_pdf_bytes)
                print("\n--- Parsing Result ---")
                if parsed_result['success']:
                    print("Status: SUCCESS")
                    print(f"  Payer: {parsed_result.get('payer')}")
                    print(f"  Payer Account: {parsed_result.get('payer_account')}")
                    print(f"  Receiver: {parsed_result.get('receiver')}")
                    print(f"  Receiver Account: {parsed_result.get('receiver_account')}")
                    print(f"  Amount: {parsed_result.get('amount')}")
                    print(f"  Date: {parsed_result.get('date')}")
                    print(f"  Reference: {parsed_result.get('reference')}")
                    print(f"  Reason: {parsed_result.get('reason')}")
                else:
                    print("Status: FAILED")
                    print(f"  Error: {parsed_result.get('error')}")

            except FileNotFoundError:
                print(f"Error: File not found at '{pdf_path}'. Please check the path.")
            except Exception as e:
                print(f"An error occurred while reading or parsing the PDF: {e}")

        elif choice == '3':
            print("Exiting.")
            break
        else:
            print("Invalid choice. Please try again.")