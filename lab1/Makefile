IMAGE := quotes-scraper

.PHONY: build run clean ci

build:
	docker build -t $(IMAGE) .

run: build
	mkdir -p out
	docker run --rm -v "$(CURDIR)/out:/app/out" $(IMAGE)

clean:
	docker rmi -f $(IMAGE)
	rm -rf out

ci: run
	node -e "const q = require('./out/result.json'); if (!q.length) process.exit(1); console.log('OK:', q.length, 'quotes')"
