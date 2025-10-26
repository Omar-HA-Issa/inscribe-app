const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = {
  async testDB() {
    const res = await fetch(`${API_URL}/api/test-db`)
    return res.json()
  },

  async uploadDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  },

}