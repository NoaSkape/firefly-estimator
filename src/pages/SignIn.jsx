import React from 'react'
import { SignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthErrorHandler } from '../components/AuthErrorHandler'

export default function SignInPage() {
	const [searchParams] = useSearchParams()
	const redirectUrl = searchParams.get('redirect') || '/'
	const { handleAuthError } = useAuthErrorHandler()

	return (
		<>
			<Helmet>
				<title>Sign In - Firefly Tiny Homes</title>
				<meta
					name="description"
					content="Sign in to your Firefly Tiny Homes account to access your saved customizations and continue your home building journey."
				/>
			</Helmet>

			{/* Single centering context */}
			<div className="min-h-screen p-4 grid place-items-center">
				{/* Column wrapper controls width & horizontal centering */}
				<div className="w-full max-w-sm">
					{/* Icon */}
					<div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-lg overflow-hidden relative z-10">
						<img
							src="/app-icon.png"
							alt="Firefly Tiny Homes"
							className="w-full h-full object-contain p-1"
						/>
					</div>

					{/* Title */}
					<h1 className="text-2xl font-bold text-white text-center mb-2 relative z-10">
						Welcome Back
					</h1>

					{/* Subtitle */}
					<p className="text-gray-300 text-center mb-6 relative z-10">
						Sign in to your Firefly Tiny Homes account
					</p>

					{/* Sign In Card */}
					<div className="w-full max-w-sm mx-auto">
						<SignIn
							appearance={{
								elements: {
									rootBox: 'w-full max-w-sm mx-auto',
									formButtonPrimary: 'btn-primary w-full',
									card: 'bg-white shadow-lg rounded-lg p-6 w-full mx-auto overflow-hidden',
									headerTitle: 'text-xl font-semibold text-gray-900 text-center',
									headerSubtitle: 'text-gray-600 text-center',
									socialButtonsBlockButton: 'btn-secondary w-full',
									formFieldInput:
										'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900',
									formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
									footer: 'w-full max-w-sm mx-auto p-0',
									footerAction: 'w-full max-w-sm mx-auto',
									footerActionText: 'w-full text-center',
									footerActionLink: 'text-yellow-600 hover:text-yellow-500',
									dividerLine: 'bg-gray-300',
									dividerText: 'text-gray-500 bg-white px-2 text-center',
								},
							}}
							signUpUrl="/sign-up"
							fallbackRedirectUrl={redirectUrl}
							routing="hash"
							showOptionalFields
							initialValues={{ emailAddress: '', password: '' }}
							onError={handleAuthError}
						/>
					</div>
				</div>
			</div>
		</>
	)
}
