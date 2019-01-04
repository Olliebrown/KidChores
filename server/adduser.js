import bcrypt from 'bcryptjs'

let hash = bcrypt.hashSync('myPassword', 10)
console.log(hash)

if (bcrypt.compareSync('myPassword', hash)) {
  console.log('MATCH')
} else {
  console.log('FAILURE')
}
