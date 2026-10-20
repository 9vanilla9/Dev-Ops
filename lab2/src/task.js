import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Отправляет одно задание и ждёт результат в S3 (для make run)
const { AWS_ENDPOINT_URL, QUEUE_URL, BUCKET_NAME } = process.env;
const URL = 'https://quotes.toscrape.com/scroll';

const sqs = new SQSClient({ endpoint: AWS_ENDPOINT_URL });
const s3 = new S3Client({ endpoint: AWS_ENDPOINT_URL, forcePathStyle: true });

const taskId = randomUUID();
const key = `results/${taskId}.json`;

await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ taskId, url: URL }),
}));
console.log('Отправлено задание', taskId);

let body;
for (let i = 0; i < 60 && !body; i++) {
    await sleep(3000);
    try {
        const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        body = await res.Body.transformToString();
    } catch (err) {
        if (err.name !== 'NoSuchKey') throw err;
    }
}

if (!body) {
    console.error('Результат не появился в S3');
    process.exit(1);
}

const quotes = JSON.parse(body);
if (!Array.isArray(quotes) || quotes.length === 0) {
    console.error('В S3 пустой результат');
    process.exit(1);
}

await mkdir('out', { recursive: true });
await writeFile('out/result.json', body);
console.log(`s3://${BUCKET_NAME}/${key}: ${quotes.length} цитат, копия в out/result.json`);

// Воркер удаляет сообщение сразу после записи в S3, даём ему пару секунд
for (let i = 0; i < 10; i++) {
    const { Attributes } = await sqs.send(new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    }));
    const left = Number(Attributes.ApproximateNumberOfMessages)
        + Number(Attributes.ApproximateNumberOfMessagesNotVisible);
    if (left === 0) {
        console.log('Очередь пуста: сообщение удалено');
        process.exit(0);
    }
    await sleep(1000);
}

console.error('Сообщение не удалено из очереди');
process.exit(1);
