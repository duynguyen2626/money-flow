import { createHash } from 'crypto';

function toPocketBaseId(sourceId, fallbackPrefix = 'mf3') {
    if (!sourceId) return 'empty';

    if (/^[a-z0-9]{15}$/.test(sourceId)) {
        return sourceId
    }

    const digest = createHash('sha256').update(String(sourceId)).digest()
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let index = 0; index < 15; index++) {
        result += chars[digest[index] % chars.length]
    }
    return result
}

const slug = 'e2e64637';
console.log(`Slug: ${slug}`);
console.log(`Hash of Slug: ${toPocketBaseId(slug)}`);

const uuid = 'e2e64637-671e-450f-a42e-9844c35e3637'; // Hypothetical UUID starting with e2e64637
console.log(`Full UUID: ${uuid}`);
console.log(`Hash of UUID: ${toPocketBaseId(uuid)}`);
