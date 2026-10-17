const crypto = require('crypto')

const bytes = crypto.randomBytes(20);
const updatedBytes = crypto.createHash('sha256').update(bytes).digest('hex')
console.log(updatedBytes)
console.log(bytes.toString("hex"))