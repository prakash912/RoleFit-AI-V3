export type JDWeights = Record<string, number>

export interface JDItem {
  id: string
  text: string
  must: boolean
  veryMust?: string[]
  tags: string[]
}

export interface JDTemplate {
  role: string
  weights: JDWeights
  items: JDItem[]
}

export const defaultTemplates: Record<string, JDTemplate> = {
  software_engineer: {
    role: "software_engineer",
    weights: {
      foundation: 0.15,
      frontend: 0.25,
      backend: 0.05,
      databases: 0.15,
      cloud_devops: 0.15,
      security_auth: 0.1,
      tdd_quality: 0.05,
      collab_agile: 0.05,
      perf_optim: 0.05,
    },
    items: [
      {
        id: "foundation",
        text: "Strong foundation in software design and data structures",
        must: true,
        veryMust: ["javascript", "vue"],
        tags: ["dsa", "design patterns", "data structures", "algorithms"],
      },
      {
        id: "frontend",
        text: "Proficiency in React.js and/or Vue.js",
        must: true,
        tags: ["react", "vue", "nextjs", "nuxt", "redux", "zustand"],
      },
      {
        id: "backend",
        text: "Proficiency in Node.js (API design, Express/Nest)",
        must: true,
        tags: ["node", "express", "nest", "api", "rest", "graphql"],
      },
      {
        id: "databases",
        text:
          "Hands-on with relational and NoSQL databases including schema design, indexing, query optimization",
        must: true,
        tags: ["postgres", "mysql", "mongodb", "index", "query plan", "sql", "nosql"],
      },
      {
        id: "security_auth",
        text: "Authentication & Security: JWT, OAuth2, session management",
        must: true,
        tags: ["jwt", "oauth", "oauth2", "session", "owasp"],
      },
      {
        id: "cloud_devops",
        text:
          "AWS services: EC2, S3, RDS, Lambda, API Gateway; CI/CD with GitHub Actions/Jenkins/GitLab CI; Docker",
        must: true,
        tags: [
          "aws",
          "ec2",
          "s3",
          "rds",
          "lambda",
          "api gateway",
          "github actions",
          "jenkins",
          "gitlab",
          "docker",
          "ci/cd",
          "kubernetes",
        ],
      },
      {
        id: "collab_agile",
        text: "Agile collaboration (Scrum, Jira) and Git workflows (branching, PR reviews)",
        must: false,
        tags: ["jira", "scrum", "pull request", "pr review", "branching", "git"],
      },
      {
        id: "perf_optim",
        text:
          "Performance optimization: FE (bundle, lazy load, caching) + BE (query optimization, API scaling)",
        must: false,
        tags: ["bundle", "lazy", "cache", "caching", "scaling", "profiling", "performance"],
      },
      {
        id: "tdd_quality",
        text: "Familiarity with TDD and modern testing workflows",
        must: false,
        tags: ["tdd", "jest", "mocha", "cypress", "playwright", "unit test", "integration test"],
      },
      {
        id: "soft_skills",
        text: "Strong problem-solving, debugging, communication",
        must: false,
        tags: ["communication", "debugging", "problem-solving", "collaboration"],
      },
    ],
  },
}



