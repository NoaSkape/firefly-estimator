import * as XLSX from 'xlsx'

export const parseOptionsExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Parse the data into our expected format
        const categories = []
        let currentCategory = null
        
        jsonData.forEach((row, index) => {
          if (index === 0) return // Skip header row
          
          const [category, optionName, price, description] = row
          
          if (category && category.trim()) {
            // New category
            currentCategory = {
              id: category.toLowerCase().replace(/\s+/g, '-'),
              name: category.trim(),
              options: []
            }
            categories.push(currentCategory)
          }
          
          if (currentCategory && optionName && price) {
            // Add option to current category
            currentCategory.options.push({
              id: `${currentCategory.id}-${optionName.toLowerCase().replace(/\s+/g, '-')}`,
              name: optionName.trim(),
              price: parseFloat(price) || 0,
              description: description?.trim() || ''
            })
          }
        })
        
        resolve({ categories })
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + error.message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

export const validateExcelStructure = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Check if we have at least a header row and one data row
        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'))
          return
        }
        
        // Check header structure
        const header = jsonData[0]
        const expectedHeaders = ['Category', 'Option Name', 'Price', 'Description']
        
        const hasValidHeaders = expectedHeaders.every(expected => 
          header.some(h => h && h.toLowerCase().includes(expected.toLowerCase()))
        )
        
        if (!hasValidHeaders) {
          reject(new Error('Excel file must have columns: Category, Option Name, Price, Description'))
          return
        }
        
        resolve(true)
      } catch (error) {
        reject(new Error('Failed to validate Excel file: ' + error.message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
} 