SHELL += -eu

zip: build
	strip ./dist/cr/*
	zip ./dist/webhook-manager-fn.zip ./dist/cr/webhook-manager-fn
	zip ./dist/trigger-fn.zip ./dist/cr/trigger-fn
	zip ./dist/remove-secret-key.zip ./dist/lambda/remove-secret-key

build: clear
	env CGO_ENABLED=0 GOARCH=amd64 GOOS=linux go build -o ./dist/cr/trigger-fn ./src/constructs/trigger-fn
	env CGO_ENABLED=0 GOARCH=amd64 GOOS=linux go build -o ./dist/cr/webhook-manager-fn ./src/constructs/webhook-manager-fn
	env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o dist/lambda/remove-secret-key ./src/lambda/remove-secret-key

clear: gendirectory
	rm -rf ./dist/*

gendirectory:
	mkdir -p dist

dia:
	cd docs && npx cdk-dia --tree ../cdk.out/tree.json  \
	--include cross-region-stack-000000000000:eu-west-2 \
	--include cross-region-stack-000000000000:us-east-1 \
	--include GlobalBusStack \
	--include GlobalBusStack/Production/GlobalStack \
	--include GlobalBusStack/Production/LocalStack-000000000000-eu-west-1 \
	--include GlobalBusStack/Production/LocalStack-222222222222-eu-west-1 \
	--include GlobalBusStack/Production/LocalStack-333333333333-eu-west-2 \
	--include GlobalBusStack/Production/LocalStack-333333333333-us-east-1
