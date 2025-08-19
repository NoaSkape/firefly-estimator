import { useState } from 'react'
import { Seo } from '../components/Seo'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function submit(e) {
    e.preventDefault()
    console.log('contact submit', form)
    alert('Thanks! We will reach out shortly.')
    setForm({ name: '', email: '', message: '' })
  }
  return (
    <>
      <Seo title="Contact Firefly Tiny Homes" description="Call (830) 328-6109 or email info@fireflytinyhomes.com. Get pre‑approved to secure your Champion Park Model." />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Contact Us</h1>
          <p className="mt-2 text-gray-300">We’re here to help you design, finance, and schedule delivery of your park model home.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={submit} className="card space-y-3">
            <input className="input-field" placeholder="Name" value={form.name} onChange={e=>setField('name', e.target.value)} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={e=>setField('email', e.target.value)} />
            <textarea className="input-field h-32" placeholder="How can we help?" value={form.message} onChange={e=>setField('message', e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-primary" type="submit">Send</button>
              <a href="/checkout?mode=finance" className="px-4 py-2 rounded bg-yellow-400 text-gray-900 hover:bg-yellow-300">Get Pre‑Approved</a>
            </div>
          </form>
          <div className="space-y-4">
            <div className="card text-sm text-gray-300">
              <h2 className="text-lg font-semibold text-gray-100">Firefly Tiny Homes</h2>
              <p className="mt-1">6150 TX‑16, Pipe Creek, TX 78063</p>
              <p className="mt-1">Phone: <a className="text-yellow-400 hover:underline" href="tel:+18303286109">(830) 328‑6109</a></p>
              <p className="mt-1">Email: <a className="text-yellow-400 hover:underline" href="mailto:info@fireflytinyhomes.com">info@fireflytinyhomes.com</a></p>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-100">Our Location</h2>
              <div className="mt-2 overflow-hidden rounded-lg">
                <iframe
                  title="Firefly Tiny Homes Map"
                  src="https://www.google.com/maps?q=6150%20TX-16,%20Pipe%20Creek,%20TX%2078063&output=embed"
                  width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


