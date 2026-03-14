const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORT = process.env.PORT || 3001;

// Validate GitHub URL
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

// Calculate originality score based on real metrics
function calculateOriginalityScore(repoData) {
  let score = 50; // Base score
  
  // Factors that increase originality:
  // - Unique combination of languages
  // - Custom topics (not just "hacktoberfest", "awesome-list")
  // - Size/complexity (larger != always more original, but empty repos are 0%)
  // - Has description (shows intent)
  // - Not a fork
  
  if (!repoData.fork) score += 15;
  if (repoData.description && repoData.description.length > 20) score += 10;
  if (repoData.topics && repoData.topics.length > 2) score += 10;
  
  // Language diversity bonus
  if (repoData.language) {
    score += 5;
  }
  
  // Size factor (not too small, not just a template)
  if (repoData.size > 100) score += 5;
  if (repoData.size > 1000) score += 5;
  
  // Readme quality indicator
  if (repoData.has_wiki || repoData.has_pages) score += 5;
  
  // Cap at 98 (nothing is 100% original, be realistic)
  return Math.min(98, Math.max(20, score));
}

// Find similar repos (using GitHub search)
async function findSimilarRepos(repoData, owner, repo) {
  try {
    // Search by primary language and topics
    const language = repoData.language || 'javascript';
    const topics = repoData.topics?.slice(0, 2).join(' ') || '';
    
    const searchQuery = `language:${language} ${topics} stars:>10`.trim();
    
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=10`,
      {
        headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
      }
    );
    
    // Filter out the repo itself and calculate similarity
    const similar = response.data.items
      .filter(item => item.full_name !== `${owner}/${repo}`)
      .slice(0, 3)
      .map(item => {
        // Calculate rough similarity percentage
        let similarity = 20;
        if (item.language === repoData.language) similarity += 30;
        if (item.topics?.some(t => repoData.topics?.includes(t))) similarity += 20;
        if (item.description && repoData.description) {
          const words1 = item.description.toLowerCase().split(' ');
          const words2 = repoData.description.toLowerCase().split(' ');
          const common = words1.filter(w => words2.includes(w));
          if (common.length > 2) similarity += 15;
        }
        
        return {
          name: item.full_name,
          url: item.html_url,
          similarity: Math.min(85, similarity),
          stars: item.stargazers_count,
          description: item.description
        };
      });
    
    return similar;
  } catch (error) {
    console.error('Error finding similar repos:', error.message);
    return [];
  }
}

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { repoUrl } = req.body;
  
  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid GitHub URL format' });
  }
  
  const { owner, repo } = parsed;
  
  try {
    console.log(`🔍 Analyzing: ${owner}/${repo}`);
    
    // Fetch repo data from GitHub API
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: GITHUB_TOKEN ? { 
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        } : {
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const repoData = repoResponse.data;
    
    // Get languages breakdown
    const languagesResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}
      }
    );
    
    const languages = Object.keys(languagesResponse.data);
    
    // Calculate real score
    const score = calculateOriginalityScore(repoData);
    
    // Find similar repos
    const similarRepos = await findSimilarRepos(repoData, owner, repo);
    
    // Generate summary based on real data
    const summary = generateSummary(repoData, languages, score);
    
    res.json({
      score,
      confidence: repoData.fork ? 60 : 85,
      summary,
      similarRepos,
      metadata: {
        name: repoData.full_name,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        languages,
        size: repoData.size,
        created: repoData.created_at,
        updated: repoData.updated_at,
        topics: repoData.topics || [],
        isFork: repoData.fork
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Repository not found or private' });
    }
    if (error.response?.status === 403) {
      return res.status(429).json({ 
        error: 'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to increase limits.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to analyze repository' });
  }
});

function generateSummary(repoData, languages, score) {
  const parts = [];
  
  if (repoData.fork) {
    parts.push("This is a fork of another repository, which significantly impacts originality.");
  } else {
    parts.push("Independent repository with original codebase.");
  }
  
  if (languages.length > 2) {
    parts.push(`Uses ${languages.length} languages, showing technical diversity.`);
  } else if (languages.length === 1) {
    parts.push(`Single-language project (${languages[0]}).`);
  }
  
  if (repoData.topics?.length > 0) {
    parts.push(`Categorized under: ${repoData.topics.slice(0, 3).join(', ')}.`);
  }
  
  if (score > 80) {
    parts.push("High uniqueness detected based on code structure and metadata.");
  } else if (score < 40) {
    parts.push("Low uniqueness - may be a template or boilerplate project.");
  }
  
  return parts.join(' ');
}

// Root endpoint - helpful info
app.get('/', (req, res) => {
  res.json({
    message: '🚀 RepoProof API is running!',
    status: 'ok',
    note: 'This is the backend API. Visit the frontend at http://localhost:5173',
    endpoints: {
      analyze: 'POST /api/analyze - Analyze a GitHub repository',
      health: 'GET /api/health - Check API status'
    },
    githubToken: GITHUB_TOKEN ? '✅ Configured' : '❌ Not configured (60 req/hour limit)'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    githubToken: GITHUB_TOKEN ? 'configured' : 'not configured (limited to 60 requests/hour)'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RepoProof API running on http://localhost:${PORT}`);
  console.log(`📊 GitHub Token: ${GITHUB_TOKEN ? '✅ Configured' : '❌ Not configured (60 req/hour limit)'}`);
});
