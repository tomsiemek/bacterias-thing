all: compile
compile: 
	npx swc main.ts -o build/script.js
