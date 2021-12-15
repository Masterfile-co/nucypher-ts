.PHONY: build

publish: build
	npm publish --registry http://localhost:4873/

build:
	yarn build