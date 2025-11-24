// Skill ontology for semantic and related skill matching
export interface SkillRelation {
  exact: string[] // Exact synonyms
  similar: string[] // Similar skills (high confidence match)
  related: string[] // Related skills (inferred/match)
}

export const TAG_ONTOLOGY: Record<string, SkillRelation> = {
  // Frontend Frameworks
  react: {
    exact: ["react", "reactjs", "react.js", "reactjs", "react-js"],
    similar: ["react native", "nextjs", "next.js", "gatsby", "remix"],
    related: ["jsx", "hooks", "redux", "zustand", "mobx", "context api"],
  },
  vue: {
    exact: ["vue", "vuejs", "vue.js", "vue3", "vue 3"],
    similar: ["nuxt", "nuxtjs", "nuxt.js", "quasar"],
    related: ["vite", "vuex", "pinia"],
  },
  angular: {
    exact: ["angular", "angularjs", "angular.js"],
    similar: ["angular 2", "angular 4+", "typescript"],
    related: ["rxjs", "ngrx"],
  },
  nextjs: {
    exact: ["nextjs", "next.js", "next js"],
    similar: ["react", "gatsby", "remix"],
    related: ["ssr", "ssg", "vercel"],
  },
  nuxt: {
    exact: ["nuxt", "nuxtjs", "nuxt.js"],
    similar: ["vue", "vuejs"],
    related: ["ssr", "vuex"],
  },
  
  // Backend
  node: {
    exact: ["node", "nodejs", "node.js", "node-js"],
    similar: ["express", "nest", "fastify", "koa"],
    related: ["npm", "yarn", "pnpm", "package.json"],
  },
  express: {
    exact: ["express", "expressjs", "express.js"],
    similar: ["node", "fastify", "koa", "hapi"],
    related: ["middleware", "routing", "rest"],
  },
  nest: {
    exact: ["nest", "nestjs", "nest.js"],
    similar: ["angular", "typescript", "node"],
    related: ["dependency injection", "decorators"],
  },
  
  // Databases
  postgres: {
    exact: ["postgres", "postgresql", "postgres sql", "postgre"],
    similar: ["postgis", "timescaledb"],
    related: ["sql", "rdbms", "relational database"],
  },
  mysql: {
    exact: ["mysql", "mariadb"],
    similar: ["postgres", "sql", "rdbms"],
    related: ["sql queries", "database design"],
  },
  mongodb: {
    exact: ["mongodb", "mongo", "mongo db"],
    similar: ["mongoose", "nosql"],
    related: ["document database", "json"],
  },
  
  // Cloud & DevOps
  aws: {
    exact: ["aws", "amazon web services"],
    similar: ["ec2", "s3", "lambda", "rds", "api gateway"],
    related: ["cloud computing", "serverless", "iaas"],
  },
  docker: {
    exact: ["docker", "dockerfile"],
    similar: ["containers", "containerization"],
    related: ["kubernetes", "k8s", "docker compose"],
  },
  kubernetes: {
    exact: ["kubernetes", "k8s"],
    similar: ["docker", "containers"],
    related: ["container orchestration", "helm", "kubectl"],
  },
  "ci/cd": {
    exact: ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment"],
    similar: ["github actions", "jenkins", "gitlab ci", "circleci", "travis"],
    related: ["devops", "automation", "pipeline"],
  },
  "github actions": {
    exact: ["github actions", "gh actions", "github ci"],
    similar: ["ci/cd", "gitlab ci", "jenkins"],
    related: ["github", "automation", "workflow"],
  },
  jenkins: {
    exact: ["jenkins"],
    similar: ["ci/cd", "pipeline"],
    related: ["automation", "build tools"],
  },
  
  // Auth & Security
  jwt: {
    exact: ["jwt", "json web token", "jsonwebtoken"],
    similar: ["oauth", "oauth2", "session"],
    related: ["authentication", "authorization", "token"],
  },
  oauth: {
    exact: ["oauth", "oauth2", "oauth 2"],
    similar: ["jwt", "openid", "saml"],
    related: ["authentication", "sso", "social login"],
  },
  
  // Testing
  jest: {
    exact: ["jest"],
    similar: ["mocha", "jasmine", "testing"],
    related: ["unit test", "tdd", "test driven"],
  },
  cypress: {
    exact: ["cypress"],
    similar: ["playwright", "selenium", "e2e"],
    related: ["testing", "integration test", "automation"],
  },
  playwright: {
    exact: ["playwright"],
    similar: ["cypress", "selenium"],
    related: ["e2e", "testing", "automation"],
  },
  
  // Languages
  javascript: {
    exact: ["javascript", "js", "ecmascript"],
    similar: ["typescript", "es6", "es2015+"],
    related: ["node", "browser", "client side"],
  },
  typescript: {
    exact: ["typescript", "ts"],
    similar: ["javascript", "js"],
    related: ["type safety", "angular", "nestjs"],
  },
  python: {
    exact: ["python", "py"],
    similar: ["django", "flask", "fastapi"],
    related: ["data science", "ml", "scripting"],
  },
}

// Helper functions
export function findSkillInOntology(skill: string): SkillRelation | null {
  if (!skill || typeof skill !== 'string') return null
  
  try {
    const normalized = skill.toLowerCase().trim()
    if (!normalized) return null
    
    // Check exact matches
    for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
      if (!relation || typeof relation !== 'object') continue
      if (key === normalized || (Array.isArray(relation.exact) && relation.exact.some((e) => e === normalized))) {
        return relation
      }
    }
    
    // Check if skill is mentioned in any relation
    for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
      if (!relation || typeof relation !== 'object') continue
      const allVariants = [key, 
        ...(Array.isArray(relation.exact) ? relation.exact : []),
        ...(Array.isArray(relation.similar) ? relation.similar : []),
        ...(Array.isArray(relation.related) ? relation.related : [])
      ].filter(v => v && typeof v === 'string')
      
      if (allVariants.some((v) => {
        const vNorm = v.toLowerCase()
        return vNorm === normalized || normalized.includes(vNorm) || vNorm.includes(normalized)
      })) {
        return relation
      }
    }
  } catch (e) {
    console.warn("Error in findSkillInOntology:", e)
  }
  
  return null
}

export function isSimilarSkill(skill1: string, skill2: string): boolean {
  if (!skill1 || !skill2 || typeof skill1 !== 'string' || typeof skill2 !== 'string') {
    return false
  }
  
  try {
    const norm1 = skill1.toLowerCase().trim()
    const norm2 = skill2.toLowerCase().trim()
    
    if (!norm1 || !norm2) return false
    
    // Direct match
    if (norm1 === norm2) return true
    
    // Check if one skill is in the other's exact/similar lists
    const relation1 = findSkillInOntology(skill1)
    const relation2 = findSkillInOntology(skill2)
    
    if (relation1) {
      const all1 = [skill1, 
        ...(Array.isArray(relation1.exact) ? relation1.exact : []),
        ...(Array.isArray(relation1.similar) ? relation1.similar : [])
      ]
        .filter(s => s && typeof s === 'string')
        .map(s => s.toLowerCase())
      if (all1.includes(norm2)) return true
    }
    
    if (relation2) {
      const all2 = [skill2,
        ...(Array.isArray(relation2.exact) ? relation2.exact : []),
        ...(Array.isArray(relation2.similar) ? relation2.similar : [])
      ]
        .filter(s => s && typeof s === 'string')
        .map(s => s.toLowerCase())
      if (all2.includes(norm1)) return true
    }
    
    // Cross-reference: if both are in ontology and share same base (e.g., both are "react")
    if (relation1 && relation2) {
      // Check if they're the same ontology entry or similar
      for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
        if (!relation || typeof relation !== 'object') continue
        const keyVariants = [key,
          ...(Array.isArray(relation.exact) ? relation.exact : []),
          ...(Array.isArray(relation.similar) ? relation.similar : [])
        ]
          .filter(s => s && typeof s === 'string')
          .map(s => s.toLowerCase())
        if (keyVariants.includes(norm1) && keyVariants.includes(norm2)) {
          return true
        }
      }
    }
  } catch (e) {
    console.warn("Error in isSimilarSkill:", e)
    return false
  }
  
  return false
}

export function isRelatedSkill(candidateSkill: string, requiredSkill: string): boolean {
  if (!candidateSkill || !requiredSkill || typeof candidateSkill !== 'string' || typeof requiredSkill !== 'string') {
    return false
  }
  
  try {
    const normCandidate = candidateSkill.toLowerCase().trim()
    const normRequired = requiredSkill.toLowerCase().trim()
    
    if (!normCandidate || !normRequired) return false
    
    if (normCandidate === normRequired) return false // Already matched as similar
    
    const candidateRelation = findSkillInOntology(candidateSkill)
    const requiredRelation = findSkillInOntology(requiredSkill)
    
    if (!candidateRelation || !requiredRelation) return false
    
    // Check if candidate skill appears in required skill's related list
    const requiredRelated = Array.isArray(requiredRelation.related) 
      ? requiredRelation.related.filter(r => r && typeof r === 'string').map(r => r.toLowerCase())
      : []
    if (requiredRelated.includes(normCandidate)) return true
    
    // Check if required skill appears in candidate skill's related list
    const candidateRelated = Array.isArray(candidateRelation.related)
      ? candidateRelation.related.filter(r => r && typeof r === 'string').map(r => r.toLowerCase())
      : []
    if (candidateRelated.includes(normRequired)) return true
    
    // Check cross-ontology relationships (skills that share a parent ontology entry)
    for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
      if (!relation || typeof relation !== 'object') continue
      
      const keyNorm = key.toLowerCase()
      const allVariants = [keyNorm,
        ...(Array.isArray(relation.exact) ? relation.exact : []),
        ...(Array.isArray(relation.similar) ? relation.similar : []),
        ...(Array.isArray(relation.related) ? relation.related : [])
      ]
        .filter(s => s && typeof s === 'string')
        .map(s => s.toLowerCase())
      
      // If required skill is in this ontology entry
      if (allVariants.includes(normRequired)) {
        // Check if candidate's related skills overlap
        const candidateRelatedFiltered = Array.isArray(candidateRelation.related)
          ? candidateRelation.related.filter(r => r && typeof r === 'string')
          : []
        if (candidateRelatedFiltered.some(r => allVariants.includes(r.toLowerCase()))) {
          return true
        }
      }
      
      // If candidate skill is in this ontology entry
      if (allVariants.includes(normCandidate)) {
        // Check if required's related skills overlap
        const requiredRelatedFiltered = Array.isArray(requiredRelation.related)
          ? requiredRelation.related.filter(r => r && typeof r === 'string')
          : []
        if (requiredRelatedFiltered.some(r => allVariants.includes(r.toLowerCase()))) {
          return true
        }
      }
    }
  } catch (e) {
    console.warn("Error in isRelatedSkill:", e)
    return false
  }
  
  return false
}

