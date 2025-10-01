import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

var fes = {
	autoplay: "The media that tried to play (with '{{src}}') wasn't allowed to by this browser, most likely due to the browser's autoplay policy.\n\n+ More info: {{url}}",
	checkUserDefinedFns: "It seems that you may have accidentally written {{name}} instead of {{actualName}}. Please correct it if it's not intentional.",
	fileLoadError: {
		bytes: "It looks like there was a problem loading your file. {{suggestion}}",
		font: "It looks like there was a problem loading your font. {{suggestion}}",
		gif: "There was some trouble loading your GIF. Make sure that your GIF is using 87a or 89a encoding.",
		image: "It looks like there was a problem loading your image. {{suggestion}}",
		json: "It looks like there was a problem loading your JSON file. {{suggestion}}",
		large: "If your large file isn't fetched successfully, we recommend splitting the file into smaller segments and fetching those.",
		strings: "It looks like there was a problem loading your text file. {{suggestion}}",
		suggestion: "Try checking if the file path ({{filePath}}) is correct, hosting the file online, or running a local server.\n\n+ More info: {{url}}",
		table: "It looks like there was a problem loading your table file. {{suggestion}}",
		xml: "It looks like there was a problem loading your XML file. {{suggestion}}"
	},
	friendlyParamError: {
		type_EMPTY_VAR: "{{location}} {{func}}() was expecting {{formatType}} for the {{position}} parameter, received an empty variable instead. If not intentional, this is often a problem with scope.\n\n+ More info: {{url}}",
		type_TOO_FEW_ARGUMENTS: "{{location}} {{func}}() was expecting at least {{minParams}} arguments, but received only {{argCount}}.",
		type_TOO_MANY_ARGUMENTS: "{{location}} {{func}}() was expecting no more than {{maxParams}} arguments, but received {{argCount}}.",
		type_WRONG_TYPE: "{{location}} {{func}}() was expecting {{formatType}} for the {{position}} parameter, received {{argType}} instead."
	},
	globalErrors: {
		reference: {
			cannotAccess: "\n{{location}} \"{{symbol}}\" is used before declaration. Make sure you have declared the variable before using it.\n\n+ More info: {{url}}",
			notDefined: "\n{{location}} \"{{symbol}}\" is not defined in the current scope. If you have defined it in your code, you should check its scope, spelling, and letter-casing (JavaScript is case-sensitive).\n\n+ More info: {{url}}"
		},
		stackSubseq: "└[{{location}}] \n\t Called from line {{line}} in {{func}}()\n",
		stackTop: "┌[{{location}}] \n\t Error at line {{line}} in {{func}}()\n",
		syntax: {
			badReturnOrYield: "\nSyntax Error - return lies outside of a function. Make sure you’re not missing any brackets, so that return lies inside a function.\n\n+ More info: {{url}}",
			invalidToken: "\nSyntax Error - Found a symbol that JavaScript doesn't recognize or didn't expect at it's place.\n\n+ More info: {{url}}",
			missingInitializer: "\nSyntax Error - A const variable is declared but not initialized. In JavaScript, an initializer for a const is required. A value must be specified in the same statement in which the variable is declared. Check the line number in the error and assign the const variable a value.\n\n+ More info: {{url}}",
			redeclaredVariable: "\nSyntax Error - \"{{symbol}}\" is being redeclared. JavaScript doesn't allow declaring a variable more than once. Check the line number in error for redeclaration of the variable.\n\n+ More info: {{url}}",
			unexpectedToken: "\nSyntax Error - Symbol present at a place that wasn't expected.\nUsually this is due to a typo. Check the line number in the error for anything missing/extra.\n\n+ More info: {{url}}"
		},
		type: {
			constAssign: "\n{{location}} A const variable is being re-assigned. In javascript, re-assigning a value to a constant is not allowed. If you want to re-assign new values to a variable, make sure it is declared as var or let.\n\n+ More info: {{url}}",
			notfunc: "\n{{location}} \"{{symbol}}\" could not be called as a function.\nCheck the spelling, letter-casing (JavaScript is case-sensitive) and its type.\n\n+ More info: {{url}}",
			notfuncObj: "\n{{location}} \"{{symbol}}\" could not be called as a function.\nVerify whether \"{{obj}}\" has \"{{symbol}}\" in it and check the spelling, letter-casing (JavaScript is case-sensitive) and its type.\n\n+ More info: {{url}}",
			readFromNull: "\n{{location}} The property of null can't be read. In javascript the value null indicates that an object has no value.\n\n+ More info: {{url}}",
			readFromUndefined: "\n{{location}} Cannot read property of undefined. Check the line number in error and make sure the variable which is being operated is not undefined.\n\n + More info: {{url}}"
		}
	},
	libraryError: "{{location}} An error with message \"{{error}}\" occurred inside the p5js library when {{func}} was called. If not stated otherwise, it might be an issue with the arguments passed to {{func}}.",
	location: "[{{file}}, line {{line}}]",
	misspelling: "{{location}} It seems that you may have accidentally written \"{{name}}\" instead of \"{{actualName}}\". Please correct it to {{actualName}} if you wish to use the {{type}} from p5.js.",
	misspelling_plural: "{{location}} It seems that you may have accidentally written \"{{name}}\".\nYou may have meant one of the following: \n{{suggestions}}",
	misusedTopLevel: "Did you just try to use p5.js's {{symbolName}} {{symbolType}}? If so, you may want to move it into your sketch's setup() function.\n\n+ More info: {{url}}",
	preloadDisabled: "The preload() function has been removed in p5.js 2.0. Please load assets in setup() using async / await keywords or callbacks instead. See https://dev.to/limzykenneth/asynchronous-p5js-20-458f for more information.",
	positions: {
		p_1: "first",
		p_10: "tenth",
		p_11: "eleventh",
		p_12: "twelfth",
		p_2: "second",
		p_3: "third",
		p_4: "fourth",
		p_5: "fifth",
		p_6: "sixth",
		p_7: "seventh",
		p_8: "eighth",
		p_9: "ninth"
	},
	pre: "\n🌸 p5.js says: {{message}}",
	sketchReaderErrors: {
		reservedConst: "you have used a p5.js reserved variable \"{{symbol}}\" make sure you change the variable name to something else.\n\n+ More info: {{url}}",
		reservedFunc: "you have used a p5.js reserved function \"{{symbol}}\" make sure you change the function name to something else.\n\n+ More info: {{url}}"
	},
	welcome: "Welcome! This is your friendly debugger. To turn me off, switch to using p5.min.js.",
	wrongPreload: "{{location}} An error with message \"{{error}}\" occurred inside the p5js library when \"{{func}}\" was called. If not stated otherwise, it might be due to \"{{func}}\" being called from preload. Nothing besides load calls (loadImage, loadJSON, loadFont, loadStrings, etc.) should be inside the preload function."
};
var en = {
	fes: fes
};

// Only one language is imported above. This is intentional as other languages
// will be hosted online and then downloaded whenever needed

/*
 * Here, we define a default/fallback language which we can use without internet.
 * You won't have to change this when adding a new language.
 *
 * `translation` is the namespace we are using for our initial set of strings
 */
var fallbackResources = {
  en: {
    translation: en
  }
};

/*
 * This is a list of languages that we have added so far.
 * If you have just added a new language (yay!), add its key to the list below
 * (`en` is english, `es` es español). Also add its export to
 * dev.js, which is another file in this folder.
 * @private
 */
const languages = [
  'en',
  'es',
  'ko',
  'zh',
  'hi',
  'ja'
];

if (typeof IS_MINIFIED === 'undefined') {
  // internationalization is only for the unminified build

  if (typeof P5_DEV_BUILD !== 'undefined') {
    // When the library is built in development mode ( using npm run dev )
    // we want to use the current translation files on the disk, which may have
    // been updated but not yet pushed to the CDN.
    let completeResources = require('../../translations/dev');
    for (const language of Object.keys(completeResources)) {
      // In es_translation, language is es and namespace is translation
      // In es_MX_translation, language is es-MX and namespace is translation
      const parts = language.split('_');
      const lng = parts.slice(0, parts.length - 1).join('-');
      const ns = parts[parts.length - 1];

      fallbackResources[lng] = fallbackResources[lng] || {};
      fallbackResources[lng][ns] = completeResources[language];
    }
  }
}

/*
 * This is our i18next "backend" plugin. It tries to fetch languages
 * from a CDN.
 * @private
 */
class FetchResources {
  constructor(services, options) {
    this.init(services, options);
  }

  // run fetch with a timeout. Automatically rejects on timeout
  // default timeout = 2000 ms
  fetchWithTimeout(url, options, timeout = 2000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
  }

  init(services, options = {}) {
    this.services = services;
    this.options = options;
  }

  read(language, namespace, callback) {
    const loadPath = this.options.loadPath;

    if (language === this.options.fallback) {
      // if the default language of the user is the same as our inbuilt fallback,
      // there's no need to fetch resources from the cdn. This won't actually
      // need to run when we use "partialBundledLanguages" in the init
      // function.
      callback(null, fallbackResources[language][namespace]);
    } else if (languages.includes(language)) {
      // The user's language is included in the list of languages
      // that we so far added translations for.

      const url = this.services.interpolator.interpolate(loadPath, {
        lng: language,
        ns: namespace
      });
      this.loadUrl(url, callback);
    } else {
      // We don't have translations for this language. i18next will use
      // the default language instead.
      callback('Not found', false);
    }
  }

  loadUrl(url, callback) {
    this.fetchWithTimeout(url)
      .then(
        response => {
          const ok = response.ok;

          if (!ok) {
            // caught in the catch() below
            throw new Error(`failed loading ${url}`);
          }
          return response.json();
        },
        () => {
          // caught in the catch() below
          throw new Error(`failed loading ${url}`);
        }
      )
      .then(data => {
        return callback(null, data);
      })
      .catch(callback);
  }
}
FetchResources.type = 'backend';

/**
 * This is our translation function. Give it a key and
 * it will retrieve the appropriate string
 * (within supported languages) according to the
 * user's browser's language settings.
 * @function translator
 * @param {String} key a key that corresponds to a message in our translation files
 * @param {Object} values values for use in the message under the given `key`
 * @returns {String} message (with values inserted) in the user's browser language
 * @private
 */
let translator = (key, values) => {
  console.debug('p5.js translator called before translations were loaded');

  // Certain FES functionality may trigger before translations are downloaded.
  // Using "partialBundledLanguages" option during initialization, we can
  // still use our fallback language to display messages
  i18next.t(key, values); /* i18next-extract-disable-line */
};
// (We'll set this to a real value in the init function below!)

/*
 * Set up our translation function, with loaded languages
 * @private
 */
const initialize = () => {
  let i18init = i18next
    .use(LanguageDetector)
    .use(FetchResources)
    .init({
      fallbackLng: 'en',
      nestingPrefix: '$tr(',
      nestingSuffix: ')',
      defaultNS: 'translation',
      returnEmptyString: false,
      interpolation: {
        escapeValue: false
      },
      detection: {
        checkWhitelist: false,

        // prevent storing or locating language from cookie or localStorage
        // more info on https://github.com/processing/p5.js/issues/4862
        order: ['querystring', 'navigator', 'htmlTag', 'path', 'subdomain'],
        caches: []
      },
      backend: {
        fallback: 'en',
        loadPath:
          'https://cdn.jsdelivr.net/npm/p5/translations/{{lng}}/{{ns}}.json'
      },
      partialBundledLanguages: true,
      resources: fallbackResources
    })
    .then(
      translateFn => {
        translator = translateFn;
      },
      e => console.debug(`Translations failed to load (${e})`)
    );

  // i18next.init() returns a promise that resolves when the translations
  // are loaded. We use this in core/init.js to hold p5 initialization until
  // we have the translation files.
  return i18init;
};

/*
 * Returns a list of languages we have translations loaded for
 * @private
 */
const availableTranslatorLanguages = () => {
  return i18next.languages;
};

/*
 * Returns the current language selected for translation
 * @private
 */
const currentTranslatorLanguage = language => {
  return i18next.language;
};

/*
 * Sets the current language for translation
 * Returns a promise that resolved when loading is finished,
 * or rejects if it fails.
 * @private
 */
const setTranslatorLanguage = language => {
  return i18next.changeLanguage(language || undefined, e =>
    console.debug(`Translations failed to load (${e})`)
  );
};

export { availableTranslatorLanguages, currentTranslatorLanguage, initialize, setTranslatorLanguage, translator };
