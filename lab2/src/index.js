import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { scrape } from './scraper.js';

// Все параметры подключения приходят из окружения, в коде адресов нет
const { AWS_ENDPOINT_URL, QUEUE_URL, BUCKET_NAME } = process.env;

if (!QUEUE_URL || !BUCKET_NAME) {
    console.error('Не заданы QUEUE_URL и BUCKET_NAME');
    process.exit(1);
}

const sqs = new SQSClient({ endpoint: AWS_ENDPOINT_URL });
const s3 = new S3Client({ endpoint: AWS_ENDPOINT_URL, forcePathStyle: true });

console.log('Жду задания из', QUEUE_URL);

while (true) {
    const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
    }));

    for (const message of Messages) {
        try {
            const task = JSON.parse(message.Body);
            console.log('Получено задание', task.taskId, task.url);

            const quotes = await scrape(task.url);
            if (quotes.length === 0) {
                throw new Error('Цитаты не найдены');
            }

            const key = `results/${task.taskId}.json`;
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: JSON.stringify(quotes, null, 2),
                ContentType: 'application/json',
            }));
            console.log('Сохранено в', `s3://${BUCKET_NAME}/${key}`);

            // Удаляем только после успешной записи: если упали раньше,
            // сообщение вернётся в очередь после visibility timeout
            await sqs.send(new DeleteMessageCommand({
                QueueUrl: QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
            }));
            console.log('Задание', task.taskId, 'удалено из очереди');
        } catch (err) {
            console.error('Задание не выполнено, сообщение остаётся в очереди:', err.message);
        }
    }
}
