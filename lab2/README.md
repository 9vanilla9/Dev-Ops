# Quotes Scraper + Terraform

Скрапер цитат из [первой лабораторной](../lab1/), перенесённый в инфраструктуру, описанную кодом.
Вместо записи в локальную папку он получает задание из очереди SQS и сохраняет результат в S3 bucket.

Облако локальное: [Floci](https://github.com/floci-io/floci) (`floci/floci:2.2.0`) в Docker эмулирует AWS
на `localhost:4566`. Bucket и очередь создаёт Terraform.

```
make run ──► SQS scrape-tasks ──► scraper (воркер) ──► S3 quotes-results/results/<taskId>.json
                                       │
                                       └─ DeleteMessage только после успешной записи в S3
```

## Структура

```
.
├─ src/
│  ├─ index.js                # воркер: SQS → скрапинг → S3 → удаление сообщения
│  ├─ scraper.js              # скрапинг страницы через Playwright
│  └─ task.js                 # отправка задания и проверка результата (make run)
├─ infra/                     # Terraform: bucket и очередь
│  ├─ versions.tf             # версии Terraform и провайдера aws
│  ├─ provider.tf             # провайдер aws, направленный в Floci
│  ├─ main.tf                 # aws_s3_bucket и aws_sqs_queue
│  ├─ variables.tf            # имена ресурсов, endpoint, регион
│  ├─ outputs.tf              # bucket_name и queue_url для приложения
│  └─ .terraform.lock.hcl     # зафиксированная версия провайдера (коммитится)
├─ compose.yaml               # сервисы floci и scraper
├─ Dockerfile                 # multistage-сборка образа (как в lab1)
├─ Makefile                   # все команды лабы
└─ out/                       # копия результата после make run (в git не попадает)
```

## Как приложение находит очередь и bucket

Адресов в коде нет. Воркер читает переменные окружения:

| Переменная | Откуда берётся |
|---|---|
| `AWS_ENDPOINT_URL` | `compose.yaml`: `http://floci:4566` (имя сервиса внутри сети Docker) |
| `QUEUE_URL` | `terraform output queue_url`, подставляет Makefile |
| `BUCKET_NAME` | `terraform output bucket_name`, подставляет Makefile |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | фейковые `test`, Floci их не проверяет |

## Команды

Требования: Docker с Compose, Terraform ≥ 1.10, make. Все действия выполняются только через `make`.

| Команда | Что делает |
|---|---|
| `make provision` | Запускает Floci и ждёт его готовности, затем `terraform init` + `apply`: создаёт S3 bucket и SQS queue. Повторный запуск ничего не меняет |
| `make build` | Собирает образ скрапера |
| `make deploy` | Собирает образ и запускает воркер в фоне, передавая адреса очереди и bucket из `terraform output` |
| `make run` | Отправляет одно задание в SQS, ждёт JSON в S3, копирует его в `out/result.json` и проверяет, что очередь пуста |
| `make clean` | Удаляет контейнер и образ скрапера и папку `out/` |
| `make destroy` | `terraform destroy` и остановка Floci. Повторный запуск завершается без ошибки |
| `make ci` | `terraform fmt -check`, `init`, `validate`, `plan`. Эту команду вызывает CI |

Полный цикл:

```bash
make provision
make deploy
make run
make destroy
```

Пример вывода `make run`:

```
Отправлено задание c70a4bff-6bd5-49fa-b1e4-4cf40af312f5
s3://quotes-results/results/c70a4bff-6bd5-49fa-b1e4-4cf40af312f5.json: 100 цитат, копия в out/result.json
Очередь пуста: сообщение удалено
```

## Что коммитится

Коммитятся `*.tf` и `.terraform.lock.hcl`. Не коммитятся (см. `.gitignore`): `.terraform/` (скачанный провайдер),
`*.tfstate` (состояние, может содержать секреты), `.env` и `out/`.
