// Simple TF-IDF style embeddings without OpenAI
// This is a fallback when OpenAI quota is exceeded

const EMBEDDING_DIM = 1536 // Match OpenAI's dimension for compatibility

// Generate a simple hash-based embedding (fallback method)
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

// Tokenize and create a simple bag-of-words style embedding
function createSimpleEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0)
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
  
  for (const word of words) {
    const hash = Math.abs(simpleHash(word))
    const index = hash % EMBEDDING_DIM
    embedding[index] += 1
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude
    }
  }
  
  return embedding
}

// Try OpenAI first, fall back to simple embeddings
export async function generateEmbedding(text: string): Promise<number[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.data[0].embedding
      }
      
      // If OpenAI fails, fall back to simple embeddings
      console.warn('OpenAI API failed, using fallback embeddings')
    } catch (error) {
      console.warn('OpenAI API error, using fallback embeddings:', error)
    }
  }

  // Fallback to simple embeddings
  return createSimpleEmbedding(text)
}

// Generate embeddings for multiple texts
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
      const batchSize = 100
      const embeddings: number[][] = []

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: batch,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const batchEmbeddings = data.data
            .sort((a: any, b: any) => a.index - b.index)
            .map((item: any) => item.embedding)
          embeddings.push(...batchEmbeddings)
        } else {
          // Fall back for this batch
          console.warn('OpenAI API failed for batch, using fallback')
          for (const text of batch) {
            embeddings.push(createSimpleEmbedding(text))
          }
        }
      }

      return embeddings
    } catch (error) {
      console.warn('OpenAI API error, using fallback embeddings:', error)
    }
  }

  // Fallback: generate simple embeddings for all texts
  return texts.map(text => createSimpleEmbedding(text))
}
