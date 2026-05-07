import { NextResponse } from 'next/server'

export async function proxy(req) {
  return NextResponse.next()
}