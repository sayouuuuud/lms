import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  try {
    const hashedPassword = bcrypt.hashSync('password123', 10)
    const newUserId = crypto.randomUUID()
    const user = await prisma.user.create({
      data: {
        id: newUserId,
        email: 'test' + Date.now() + '@example.com',
        encrypted_password: hashedPassword,
        role: 'student',
        phone: '123456789' + Date.now().toString().slice(-4),
      }
    })
    console.log("User created:", user)
  } catch (error: any) {
    console.error("Error creating user:")
    console.error(error)
  }
}

main()
