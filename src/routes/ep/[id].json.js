import fs from 'fs'
export async function get({ params }) {
  const { id } = params
  const lines = fs.readFile(`src/assets/transcripts/${id}.json`, (err, data) => {
    if (err) throw err
    return data
  })
  
  const body = JSON.stringify(lines)
  if (body) {
    return { body }
  }
}