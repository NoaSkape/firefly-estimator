import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const HeroHeader = ({ 
  title, 
  subtitle, 
  backgroundImage, 
  breadcrumbs = [],
  children 
}) => {
  return (
    <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex justify-center mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-300">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
                  )}
                  {crumb.href ? (
                    <Link 
                      to={crumb.href}
                      className="hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-300">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </div>


      </div>
    </section>
  )
}

export default HeroHeader
