import re
import logging
from typing import TypedDict, Optional, Union, List
from datetime import datetime
import time

import requests
from playwright.sync_api import sync_playwright, Playwright, Browser, Page, Response
import fitz 

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CbeVerificationError(Exception):
    """Base exception for CBE verification issues."""
    pass

class CbeServiceRetrievalError(CbeVerificationError):
    """Indicates an error in retrieving the document from CBE (network, Playwright setup/navigation, PDF not found)."""
    def __init__(self, message, underlying_error=None):
        super().__init__(message)
        self.underlying_error = underlying_error

class VerifyResult(TypedDict):
    success: bool
    payer: Optional[str]
    payer_account: Optional[str]
    receiver: Optional[str]
    receiver_account: Optional[str]
    amount: Optional[float]
    date: Optional[datetime]
    reference: Optional[str]
    reason: Optional[str]
    error: Optional[str] 

def title_case(s: str) -> str:
    if not s: return ""
    return s.lower().title()

def parse_cbe_receipt(pdf_buffer: bytes) -> VerifyResult:
    try:
        doc = fitz.open(stream=pdf_buffer, filetype="pdf")
        raw_text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            raw_text += page.get_text("text")
        doc.close()

        raw_text = ' '.join(raw_text.split())
        
        payer_name_match = re.search(r"Payer\s*:?\s*(.*?)\s+Account", raw_text, re.IGNORECASE)
        receiver_name_match = re.search(r"Receiver\s*:?\s*(.*?)\s+Account", raw_text, re.IGNORECASE)

        payer_name = title_case(payer_name_match.group(1).strip()) if payer_name_match else None
        receiver_name = title_case(receiver_name_match.group(1).strip()) if receiver_name_match else None

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
        
        date_raw_match = re.search(
            r"Payment Date & Time\s*:?\s*(\d{1,2}/\d{1,2}/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[APM]{2})",
            raw_text,
            re.IGNORECASE
        )
        date_raw = date_raw_match.group(1).strip() if date_raw_match else None
        transaction_date: Optional[datetime] = None
        if date_raw:
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
                success=True, payer=payer_name, payer_account=payer_account,
                receiver=receiver_name, receiver_account=receiver_account,
                amount=amount, date=transaction_date, reference=reference,
                reason=reason, error=None
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
            error_msg = f"Could not extract all required fields from PDF. Missing: {', '.join(missing_fields) or 'unknown'}"
            logger.error(error_msg)
            logger.debug(f"Payer: {payer_name}, PAccount: {payer_account}, Receiver: {receiver_name}, RAccount: {receiver_account}, Amount: {amount}, Date: {transaction_date}, Ref: {reference}")
            return VerifyResult(success=False, error=error_msg,
                                payer=payer_name, payer_account=payer_account,
                                receiver=receiver_name, receiver_account=receiver_account,
                                amount=amount, date=transaction_date, reference=reference, reason=reason)

    except Exception as parse_err:
        logger.error(f"❌ PDF parsing failed: {parse_err}", exc_info=True)
        return VerifyResult(success=False, error=f"Critical error parsing PDF data: {parse_err}",
                            payer=None, payer_account=None, receiver=None, receiver_account=None,
                            amount=None, date=None, reference=None, reason=None)


def verify_cbe(reference_id_part: str, account_suffix: str) -> VerifyResult:
    full_id = f"{reference_id_part}{account_suffix}"
    url = f"https://apps.cbe.com.et:100/?id={full_id}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/pdf,application/octet-stream,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    }

    try:
        logger.info(f"🔎 Attempting direct fetch: {url}")
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', '').lower()
        if 'application/pdf' in content_type or 'application/octet-stream' in content_type:
            logger.info("✅ Direct fetch success, parsing PDF")
            return parse_cbe_receipt(response.content)
        else:
            logger.warning(f"⚠️ Direct fetch did not return PDF. Content-Type: {content_type}. Body starts with: {response.text[:200]}")
            raise requests.exceptions.RequestException("Direct fetch did not yield a PDF document.")

    except requests.exceptions.RequestException as direct_err:
        logger.warning(f"⚠️ Direct fetch failed: {direct_err}, falling back to Playwright.")

        detected_pdf_url_holder: List[Optional[str]] = [None]

        def handle_response(response_obj: Response):
            content_type = response_obj.headers.get('content-type', '').lower()
            if 'pdf' in content_type or \
               'octet-stream' in content_type or \
               response_obj.url.lower().endswith(".pdf"):
                if detected_pdf_url_holder[0] is None:
                    detected_pdf_url_holder[0] = response_obj.url
                    logger.info(f"🧾 PDF detected by Playwright response sniffing: {detected_pdf_url_holder[0]}")

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
                ]
            )

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
                try:
                    pdf_element = page.query_selector("embed[type='application/pdf'], iframe[src$='.pdf']")
                    if pdf_element:
                        src = pdf_element.get_attribute("src")
                        if src:
                            detected_pdf_url = page.urljoin(src)
                            logger.info(f"🧾 PDF detected from embed/iframe: {detected_pdf_url}")
                except Exception as e_embed:
                    logger.warning(f"Could not find PDF in embed/iframe: {e_embed}")

            if not detected_pdf_url:
                page_main_frame_url = page.main_frame.url
                if page_main_frame_url.lower().endswith(".pdf"):
                     logger.info(f"Current page URL itself seems to be a PDF: {page_main_frame_url}")
                     detected_pdf_url = page_main_frame_url
                else:
                    try:
                        content_sample = page.content()
                        if content_sample.strip().startswith("%PDF-"):
                            logger.info(f"Page content starts with %PDF-, assuming current URL is PDF: {page_main_frame_url}")
                            detected_pdf_url = page_main_frame_url
                    except Exception as e_content:
                        logger.warning(f"Could not get page content to check for PDF signature: {e_content}")


            if not detected_pdf_url:
                page_content_sample = ""
                try:
                    page_content_sample = page.content()[:500]
                except Exception:
                    pass 
                logger.error(f"No PDF detected via Playwright. Final URL: {page.url}. Content sample: {page_content_sample}")
                raise CbeServiceRetrievalError("No PDF document detected or retrievable via Playwright after direct fetch failure.")

            logger.info(f"Fetching PDF from Playwright-detected URL: {detected_pdf_url}")
            
            is_current_page_pdf = False
            try:
                if detected_pdf_url == page.url or detected_pdf_url.startswith('data:'):
                    page_content_bytes = page.content().encode('utf-8', 'ignore') 
                    if page_content_bytes.startswith(b'%PDF'):
                        pdf_content = page_content_bytes
                        is_current_page_pdf = True
                        logger.info("Using current page content as PDF.")
            except Exception as e_curr_content:
                 logger.warning(f"Error checking if current page content is PDF: {e_curr_content}")


            if not is_current_page_pdf:
                pdf_res = requests.get(detected_pdf_url, headers=headers, verify=False, timeout=30)
                pdf_res.raise_for_status()
                pdf_content = pdf_res.content
                logger.info(f"Successfully fetched PDF content from: {detected_pdf_url}")

            return parse_cbe_receipt(pdf_content)

        except Exception as puppet_err:
            logger.error(f"❌ Playwright operations failed: {puppet_err}", exc_info=True)
            raise CbeServiceRetrievalError(
                f"Service unavailable: Playwright process failed. Original error: {puppet_err}",
                underlying_error=puppet_err
            )
        finally:
            if browser:
                try:
                    browser.close()
                except Exception as e_close_browser:
                    logger.warning(f"Error closing browser: {e_close_browser}")
            if playwright_instance:
                try:
                    playwright_instance.stop()
                except Exception as e_stop_pw:
                    logger.warning(f"Error stopping Playwright: {e_stop_pw}")
    except Exception as e_unhandled_direct:
        logger.error(f"❌ Unhandled exception during direct fetch phase: {e_unhandled_direct}", exc_info=True)
        raise CbeServiceRetrievalError(
            f"Service unavailable: Unhandled error during initial fetch. Original error: {e_unhandled_direct}",
            underlying_error=e_unhandled_direct
        )