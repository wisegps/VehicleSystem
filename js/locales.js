document.write('<script src="js/locales/i18next.js"></script>');
document.write('<script src="js/locales/i18nextBrowserLanguageDetector.js"></script>');
document.write('<script src="js/locales/i18nextLocalStorageCache.js"></script>');
document.write('<script src="js/locales/i18nextXHRBackend.js"></script>');
document.write('<script src="js/locales/loc-i18next.js"></script>');

var __t = function(key, def){
	var msg = i18next ? i18next.t(key) || def: def;
	return msg;
};

//document.ready(function() {
window.onload = function () {	
	var option = {
		loadPath: 'locales/{{lng}}/{{ns}}.json',
	};
	i18next
		.use(i18nextBrowserLanguageDetector)
		.use(i18nextXHRBackend)
		.use(i18nextLocalStorageCache)
		.init({
			backend: option,
			cache: {
				enable: true,
				expirationTime: 7 * 24 * 60 * 60 * 1000,
			},
			detection: {
				// order and from where user language should be detected
				order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
				// keys or params to lookup language from
				lookupQuerystring: 'lng',
				lookupCookie: 'i18next',
				lookupLocalStorage: 'i18nextLng',
				// cache user language on
				caches: ['localStorage', 'cookie']
			}
		}, function(err, t) {
			localize = locI18next.init(i18next);
			localize('.nav');
			localize('.content');
			localize('#btn1');
			localize('.mui-bar-nav');
			localize('.mui-bar');
			localize('.mui-content');
		});
};