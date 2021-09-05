module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true
	},
	extends: ['airbnb-base'],
	parserOptions: {
		ecmaVersion: 12
	},
	rules: {
		'no-shadow': 0,
		'no-nested-ternary': 0,
		eqeqeq: 0,
		'no-await-in-loop': 0,
		'comma-dangle': 0,
		'no-use-before-define': 0,
		'arrow-parens': 0,
		'no-plusplus': 0,
		'no-console': 0,
		'no-tabs': 0,
		indent: ['error', 'tab', 2]
	}
};
