import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const information = {
  terms: { title: 'Terms of use', paragraphs: ['Parallel is an ecommerce assessment with real accounts and test-mode payments. Orders created here are test orders and will not be shipped.', 'Only Stripe test payment methods are supported. No real charges are made.'] },
  privacy: { title: 'Privacy notice', paragraphs: ['Your account, securely hashed password, sessions, bag, wishlist and orders are stored in our database. Payment details are handled by Stripe; we do not store card numbers.', 'A secure session cookie identifies your account. A separate opaque cookie preserves a guest bag. Comparison selections stay in your browser. The presentation cookie parallel-demo-browsing only skips the introduction and cannot authenticate you.'] },
  help: { title: 'Account help', paragraphs: ['Create an account with your name, email address and a password between 8 and 128 characters. Sign in with that email and password. Phone sign-in is not supported.', 'You can browse and save a guest bag before signing in. Your guest bag is merged with your saved bag after sign-in; combined quantities are limited to 99 per product.', 'Email verification and self-service password recovery are not configured for this assessment. Contact the project administrator if you lose access.'] },
}

type Topic = keyof typeof information
function getInformation(topic: string) {
  if (!Object.hasOwn(information, topic)) notFound()
  return information[topic as Topic]
}
export function generateStaticParams() { return Object.keys(information).map((topic) => ({ topic })) }
export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  return { title: getInformation((await params).topic).title }
}
export default async function AccountInformationPage({ params }: { params: Promise<{ topic: string }> }) {
  const info = getInformation((await params).topic)
  return <section className="account-card account-information"><h1>{info.title}</h1>{info.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<Link className="account-button account-button--secondary" href="/account">Back to sign in</Link></section>
}
