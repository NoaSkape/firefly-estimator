const FeatureGrid = ({ features, columns = 3 }) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6 lg:gap-8`}>
      {features.map((feature, index) => (
        <div 
          key={index}
          className="group bg-white dark:bg-gray-800/60 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
        >
          {/* Icon */}
          {feature.icon && (
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-500/20 transition-colors">
              <feature.icon className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            </div>
          )}

          {/* Content */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {feature.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {feature.description}
          </p>

          {/* Optional CTA */}
          {feature.cta && (
            <div className="mt-4">
              <a 
                href={feature.cta.href}
                className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 font-medium transition-colors"
              >
                {feature.cta.label} →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default FeatureGrid
