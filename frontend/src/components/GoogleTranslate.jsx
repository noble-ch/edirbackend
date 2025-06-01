import { useEffect, useRef } from "react";
import { Languages } from "lucide-react";

// Flag to track if the script is loading or has loaded
let isGoogleTranslateScriptLoading = false;

function GoogleTranslateComponent() {
  const translateElementRef = useRef(null); // Ref for the target div

  useEffect(() => {
    // --- Check 1: Prevent adding script multiple times ---
    const existingScript = document.querySelector(
      'script[src="//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate"]'
    );

    // --- Check 2: Use a flag to prevent initialization race conditions ---
    // (Handles StrictMode's mount/unmount/remount better)
    let isComponentMounted = true;
    let isInitialized = false; // Track initialization for this instance

    const loadScriptAndInit = () => {
      // Only add script if it doesn't exist and isn't already loading
      if (!existingScript && !isGoogleTranslateScriptLoading) {
        console.log("Adding Google Translate script...");
        isGoogleTranslateScriptLoading = true; // Set flag

        const script = document.createElement("script");
        script.src =
          "//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate";
        script.async = true;
        script.onerror = () => {
          // Reset flag on error
          isGoogleTranslateScriptLoading = false;
          console.error("Failed to load Google Translate script.");
        };
        document.body.appendChild(script);
      } else if (window.google && window.google.translate) {
        // If script already exists or loaded, try initializing directly
        console.log("Script likely already loaded, attempting init...");
        loadGoogleTranslate();
      } else {
        console.log("Script exists or is loading, waiting for callback...");
        // The existing script's load will trigger the global callback
      }
    };

    window.loadGoogleTranslate = () => {
      // Ensure component is still mounted and hasn't initialized yet *in this effect run*
      if (!isComponentMounted || isInitialized || !translateElementRef.current)
        return;

      console.log("loadGoogleTranslate callback triggered, initializing...");
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,am,om",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            gaTrack: true,
            // Removed displayOnLoad: true - initialization implies display
          },
          translateElementRef.current.id // Use the ref's current element id
        );
        isInitialized = true; // Mark as initialized for this instance
        isGoogleTranslateScriptLoading = false; // Script has loaded and callback ran
        console.log("Google Translate Initialized.");
      } catch (error) {
        console.error("Error initializing Google Translate:", error);
        isGoogleTranslateScriptLoading = false; // Reset on error
      }
    };

    loadScriptAndInit();

    return () => {
      console.log("GoogleTranslateComponent cleanup running...");
      isComponentMounted = false;

      // Clean up the global function to avoid potential leaks if multiple
      // instances of this component were ever used (though generally not recommended
      // to have multiple instances managing the same global script).
      // Be cautious here, as another instance might still need it if StrictMode
      // caused one unmount/remount cycle. A simple deletion might be too aggressive.
      // delete window.loadGoogleTranslate; // Let's comment this out for now - might cause issues in StrictMode

      // Attempt to remove the widget instance if possible (difficult with Google's widget)
      // Google Translate injects an iframe etc. Simple removal is hard.
      // Best effort: Clear the container div.
      if (translateElementRef.current) {
        translateElementRef.current.innerHTML = "";
        console.log("Cleared google_element container.");
      }

      // Removing the SCRIPT tag itself in cleanup is often problematic,
      // especially in Strict Mode, as the second mount might need it.
      // Also, other components might rely on it if it were shared.
      // Let's leave the script tag once added.
      // const script = document.querySelector(
      //  'script[src="//translate.google.com/translate_a/element.js?cb=loadGoogleTranslate"]'
      // );
      // if (script) {
      //  document.body.removeChild(script);
      //  console.log("Removed Google Translate script tag.");
      // }
    };
  }, []); // Empty dependency array means this effect runs once after initial mount (or twice in StrictMode)

  return (
    <div className="flex border h-9 rounded-lg">
      {/* Assign the ref to the div */}
      <Languages className=" h-4 ms-2 text-white my-auto" />

      <div
        id="google_element"
        ref={translateElementRef}
        className="google-translate my-auto"
      >
        {" "}
      </div>
    </div>
  );
}

export default GoogleTranslateComponent;
