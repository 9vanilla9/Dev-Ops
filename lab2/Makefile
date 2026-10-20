IMAGE := quotes-scraper-lab2
TF := terraform -chdir=infra
# Адреса очереди и bucket берём из состояния Terraform
TF_ENV = QUEUE_URL=$$($(TF) output -raw queue_url) BUCKET_NAME=$$($(TF) output -raw bucket_name)

.PHONY: floci build provision deploy run clean destroy ci

# Запускает Floci и ждёт, пока его healthcheck станет healthy
floci:
	docker compose up -d --wait floci

build:
	docker compose build scraper

provision: floci
	$(TF) init -input=false
	$(TF) apply -auto-approve -input=false

deploy: build
	$(TF_ENV) docker compose up -d scraper

run:
	mkdir -p out
	$(TF_ENV) docker compose run --rm scraper node src/task.js

clean:
	docker compose rm -sf scraper
	docker rmi -f $(IMAGE)
	rm -rf out

destroy: floci
	$(TF) init -input=false
	$(TF) destroy -auto-approve -input=false
	docker compose down -v --remove-orphans

ci: floci
	$(TF) fmt -check -recursive
	$(TF) init -input=false -lockfile=readonly
	$(TF) validate
	$(TF) plan -input=false
