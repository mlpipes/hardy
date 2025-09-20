// import { auth } from "@/lib/auth"
import { auth } from "@/lib/auth-simple" // Using simplified auth for now
import { toNextJsHandler } from "better-auth/next-js"

export const { POST, GET } = toNextJsHandler(auth)