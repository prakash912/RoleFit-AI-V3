// Skill ontology for semantic and related skill matching
// Comprehensive ontology to ensure no candidate is judged incorrectly
export interface SkillRelation {
  exact: string[] // Exact synonyms (all variations that mean the same thing)
  similar: string[] // Similar skills (high confidence match)
  related: string[] // Related skills (inferred/match)
}

// Helper function to normalize skill names for fuzzy matching
function normalizeSkillName(skill: string): string {
  if (!skill || typeof skill !== 'string') return ''
  return skill
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .replace(/js$/, '') // Remove trailing 'js'
    .replace(/jsx$/, '') // Remove trailing 'jsx'
}

export const TAG_ONTOLOGY: Record<string, SkillRelation> = {
  // ========== FRONTEND FRAMEWORKS ==========
  react: {
    exact: ["react", "reactjs", "react.js", "react-js", "react js"],
    similar: ["react native", "reactnative", "react-native", "nextjs", "next.js", "next js", "gatsby", "remix", "remixjs"],
    related: ["jsx", "hooks", "redux", "zustand", "mobx", "context api", "contextapi", "react router", "reactrouter"],
  },
  "react native": {
    exact: ["react native", "reactnative", "react-native", "react native", "rn"],
    similar: ["react", "reactjs", "expo", "expojs"],
    related: ["mobile development", "ios", "android", "native apps"],
  },
  vue: {
    exact: ["vue", "vuejs", "vue.js", "vue-js", "vue js", "vue3", "vue 3", "vue2", "vue 2"],
    similar: ["nuxt", "nuxtjs", "nuxt.js", "nuxt js", "quasar", "quasar framework"],
    related: ["vite", "vuex", "pinia", "vue router", "vuetify"],
  },
  angular: {
    exact: ["angular", "angularjs", "angular.js", "angular-js", "angular js", "angular2", "angular 2", "angular4", "angular 4", "angular5", "angular 5", "angular6", "angular 6", "angular7", "angular 7", "angular8", "angular 8", "angular9", "angular 9", "angular10", "angular 10", "angular11", "angular 11", "angular12", "angular 12", "angular13", "angular 13", "angular14", "angular 14", "angular15", "angular 15", "angular16", "angular 16", "angular17", "angular 17"],
    similar: ["typescript", "rxjs", "ngrx"],
    related: ["angular material", "angular cli", "angularcli", "dependency injection", "decorators"],
  },
  nextjs: {
    exact: ["nextjs", "next.js", "next js", "next-js"],
    similar: ["react", "reactjs", "gatsby", "remix", "remixjs"],
    related: ["ssr", "ssg", "vercel", "server components", "app router"],
  },
  nuxt: {
    exact: ["nuxt", "nuxtjs", "nuxt.js", "nuxt js", "nuxt-js", "nuxt3", "nuxt 3", "nuxt2", "nuxt 2"],
    similar: ["vue", "vuejs"],
    related: ["ssr", "vuex", "pinia", "vue router"],
  },
  svelte: {
    exact: ["svelte", "sveltejs", "svelte.js", "svelte js"],
    similar: ["sveltekit", "svelte kit"],
    related: ["compiler", "reactive", "frontend"],
  },
  gatsby: {
    exact: ["gatsby", "gatsbyjs", "gatsby.js", "gatsby js"],
    similar: ["react", "reactjs", "nextjs"],
    related: ["ssg", "graphql", "static site"],
  },
  remix: {
    exact: ["remix", "remixjs", "remix.js", "remix js"],
    similar: ["react", "reactjs", "nextjs"],
    related: ["ssr", "web standards", "nested routing"],
  },
  
  // ========== BACKEND FRAMEWORKS ==========
  node: {
    exact: ["node", "nodejs", "node.js", "node-js", "node js", "nodejs", "nodejs"],
    similar: ["express", "expressjs", "nest", "nestjs", "fastify", "koa", "hapi"],
    related: ["npm", "yarn", "pnpm", "package.json", "packagejson", "commonjs", "es modules"],
  },
  express: {
    exact: ["express", "expressjs", "express.js", "express-js", "express js", "expressjs"],
    similar: ["node", "nodejs", "fastify", "koa", "hapi", "restify"],
    related: ["middleware", "routing", "rest", "rest api", "restapi", "api"],
  },
  nest: {
    exact: ["nest", "nestjs", "nest.js", "nest-js", "nest js", "nestjs"],
    similar: ["angular", "typescript", "node", "nodejs"],
    related: ["dependency injection", "decorators", "modules", "controllers"],
  },
  fastify: {
    exact: ["fastify", "fastifyjs", "fastify.js"],
    similar: ["express", "expressjs", "koa"],
    related: ["node", "nodejs", "performance", "async"],
  },
  koa: {
    exact: ["koa", "koajs", "koa.js", "koa js"],
    similar: ["express", "expressjs", "fastify"],
    related: ["node", "nodejs", "async await", "middleware"],
  },
  django: {
    exact: ["django", "djangoframework", "django framework"],
    similar: ["python", "flask", "fastapi"],
    related: ["orm", "mvc", "mvt", "python web"],
  },
  flask: {
    exact: ["flask", "flaskframework", "flask framework"],
    similar: ["python", "django", "fastapi"],
    related: ["python web", "microframework", "rest api"],
  },
  fastapi: {
    exact: ["fastapi", "fast api", "fast-api"],
    similar: ["python", "django", "flask"],
    related: ["python web", "async", "openapi", "pydantic"],
  },
  spring: {
    exact: ["spring", "spring framework", "springframework", "spring boot", "springboot"],
    similar: ["java", "kotlin"],
    related: ["dependency injection", "ioc", "aop", "mvc"],
  },
  laravel: {
    exact: ["laravel", "laravel framework", "laravelframework"],
    similar: ["php", "symfony"],
    related: ["eloquent", "blade", "artisan", "composer"],
  },
  rails: {
    exact: ["rails", "ruby on rails", "rubyonrails", "ror"],
    similar: ["ruby"],
    related: ["activerecord", "erb", "rake", "gems"],
  },
  
  // ========== DATABASES ==========
  postgres: {
    exact: ["postgres", "postgresql", "postgres sql", "postgre", "postgresql", "postgresql", "postgresql"],
    similar: ["postgis", "timescaledb", "timescale db"],
    related: ["sql", "rdbms", "relational database", "psql", "pg"],
  },
  mysql: {
    exact: ["mysql", "mariadb", "mariadb"],
    similar: ["postgres", "postgresql", "sql", "rdbms"],
    related: ["sql queries", "database design", "innodb", "myisam"],
  },
  mongodb: {
    exact: ["mongodb", "mongo", "mongo db", "mongo-db", "mongo db"],
    similar: ["mongoose", "mongoosejs", "nosql"],
    related: ["document database", "json", "bson", "collections"],
  },
  redis: {
    exact: ["redis", "redis cache", "rediscache"],
    similar: ["memcached", "cache"],
    related: ["key value", "keyvalue", "in memory", "inmemory"],
  },
  elasticsearch: {
    exact: ["elasticsearch", "elastic search", "elastic-search", "es"],
    similar: ["solr", "lucene"],
    related: ["search", "indexing", "analytics", "elk stack"],
  },
  sqlite: {
    exact: ["sqlite", "sqlite3", "sqlite 3"],
    similar: ["sql", "rdbms"],
    related: ["embedded database", "file database"],
  },
  cassandra: {
    exact: ["cassandra", "apache cassandra"],
    similar: ["nosql", "mongodb"],
    related: ["distributed", "wide column", "widecolumn"],
  },
  
  // ========== CLOUD & DEVOPS ==========
  aws: {
    exact: ["aws", "amazon web services", "amazonwebservices"],
    similar: ["ec2", "s3", "lambda", "rds", "api gateway", "apigateway", "dynamodb", "dynamo db", "cloudfront", "cloud front", "sns", "sqs", "iam", "vpc", "route53", "route 53"],
    related: ["cloud computing", "serverless", "iaas", "paas", "amazon"],
  },
  azure: {
    exact: ["azure", "microsoft azure", "microsoftazure", "azure cloud"],
    similar: ["azure functions", "azurefunctions", "azure devops", "azuredevops"],
    related: ["cloud computing", "microsoft", "iaas", "paas"],
  },
  gcp: {
    exact: ["gcp", "google cloud", "googlecloud", "google cloud platform", "googlecloudplatform"],
    similar: ["cloud functions", "cloudfunctions", "cloud run", "cloudrun", "gke", "bigquery", "big query"],
    related: ["cloud computing", "google", "iaas", "paas"],
  },
  docker: {
    exact: ["docker", "dockerfile", "docker file", "docker-compose", "docker compose"],
    similar: ["containers", "containerization", "container"],
    related: ["kubernetes", "k8s", "docker compose", "dockercompose", "images", "containers"],
  },
  kubernetes: {
    exact: ["kubernetes", "k8s", "k8s"],
    similar: ["docker", "containers", "containerization"],
    related: ["container orchestration", "helm", "kubectl", "pods", "services", "deployments"],
  },
  terraform: {
    exact: ["terraform", "terraformio"],
    similar: ["iac", "infrastructure as code", "infrastructureascode"],
    related: ["aws", "azure", "gcp", "provisioning"],
  },
  ansible: {
    exact: ["ansible", "ansible automation"],
    similar: ["puppet", "chef", "configuration management"],
    related: ["automation", "devops", "orchestration"],
  },
  "ci/cd": {
    exact: ["ci/cd", "cicd", "ci cd", "ci-cd", "continuous integration", "continuousintegration", "continuous deployment", "continuousdeployment", "continuous delivery", "continuousdelivery"],
    similar: ["github actions", "gh actions", "githubactions", "gitlab ci", "gitlabci", "jenkins", "circleci", "circle ci", "travis", "travis ci", "travisci", "azure devops", "azuredevops"],
    related: ["devops", "automation", "pipeline", "build", "deploy"],
  },
  "github actions": {
    exact: ["github actions", "gh actions", "github ci", "githubactions", "gh-actions"],
    similar: ["ci/cd", "cicd", "gitlab ci", "gitlabci", "jenkins"],
    related: ["github", "automation", "workflow", "yaml"],
  },
  jenkins: {
    exact: ["jenkins", "jenkins ci", "jenkinsci"],
    similar: ["ci/cd", "cicd", "pipeline"],
    related: ["automation", "build tools", "java"],
  },
  gitlab: {
    exact: ["gitlab", "gitlab ci", "gitlabci", "gitlab cicd"],
    similar: ["ci/cd", "cicd", "github actions"],
    related: ["git", "version control", "devops"],
  },
  
  // ========== AUTH & SECURITY ==========
  jwt: {
    exact: ["jwt", "json web token", "jsonwebtoken", "json web tokens", "jsonwebtokens"],
    similar: ["oauth", "oauth2", "oauth 2", "session", "sessions"],
    related: ["authentication", "auth", "authorization", "token", "tokens", "bearer token"],
  },
  oauth: {
    exact: ["oauth", "oauth2", "oauth 2", "oauth2", "oauth-2"],
    similar: ["jwt", "openid", "openid connect", "openidconnect", "saml", "saml2"],
    related: ["authentication", "auth", "sso", "single sign on", "singlesignon", "social login", "sociallogin"],
  },
  passport: {
    exact: ["passport", "passportjs", "passport.js", "passport js"],
    similar: ["authentication", "auth", "oauth", "oauth2"],
    related: ["node", "nodejs", "express", "expressjs"],
  },
  
  // ========== TESTING ==========
  jest: {
    exact: ["jest", "jestjs", "jest.js"],
    similar: ["mocha", "mochajs", "jasmine", "jasminejs", "testing", "unit testing"],
    related: ["unit test", "unittest", "tdd", "test driven", "testdriven", "test driven development"],
  },
  mocha: {
    exact: ["mocha", "mochajs", "mocha.js"],
    similar: ["jest", "jasmine", "testing"],
    related: ["unit test", "tdd", "node", "nodejs"],
  },
  cypress: {
    exact: ["cypress", "cypressio", "cypress io"],
    similar: ["playwright", "selenium", "selenium webdriver", "e2e", "end to end", "endtoend"],
    related: ["testing", "integration test", "integrationtest", "automation", "browser testing"],
  },
  playwright: {
    exact: ["playwright", "playwrightjs", "playwright.js"],
    similar: ["cypress", "selenium", "selenium webdriver", "e2e"],
    related: ["e2e", "end to end", "endtoend", "testing", "automation", "browser testing"],
  },
  selenium: {
    exact: ["selenium", "selenium webdriver", "seleniumwebdriver"],
    similar: ["cypress", "playwright", "e2e"],
    related: ["testing", "automation", "browser testing", "webdriver"],
  },
  vitest: {
    exact: ["vitest", "vitestjs"],
    similar: ["jest", "testing"],
    related: ["vite", "unit test", "tdd"],
  },
  
  // ========== LANGUAGES ==========
  javascript: {
    exact: ["javascript", "js", "ecmascript", "ecma script", "ecmascript6", "ecmascript 6", "es6", "es2015", "es2016", "es2017", "es2018", "es2019", "es2020", "es2021", "es2022", "es2023", "esnext"],
    similar: ["typescript", "ts", "node", "nodejs"],
    related: ["node", "nodejs", "browser", "client side", "clientside", "dom", "vanilla js", "vanillajs"],
  },
  typescript: {
    exact: ["typescript", "ts", "tsx", "tsx"],
    similar: ["javascript", "js"],
    related: ["type safety", "typesafety", "angular", "nestjs", "react", "reactjs"],
  },
  python: {
    exact: ["python", "py", "python3", "python 3", "python2", "python 2", "py3", "py 3"],
    similar: ["django", "flask", "fastapi", "pandas", "numpy"],
    related: ["data science", "datascience", "ml", "machine learning", "machinelearning", "scripting", "automation"],
  },
  java: {
    exact: ["java", "java8", "java 8", "java11", "java 11", "java17", "java 17", "jdk", "jre"],
    similar: ["spring", "spring boot", "springboot", "kotlin"],
    related: ["jvm", "maven", "gradle", "oop", "object oriented"],
  },
  "c++": {
    exact: ["c++", "cpp", "c plus plus", "cplusplus"],
    similar: ["c", "c language"],
    related: ["systems programming", "systemsprogramming", "performance", "memory management"],
  },
  csharp: {
    exact: ["c#", "csharp", "c sharp", "dotnet", ".net", "dot net"],
    similar: ["asp.net", "aspnet", "entity framework", "entityframework"],
    related: ["microsoft", "visual studio", "visualstudio", "nuget"],
  },
  go: {
    exact: ["go", "golang", "go language", "golanguage"],
    similar: ["docker", "kubernetes", "k8s"],
    related: ["concurrency", "goroutines", "microservices"],
  },
  rust: {
    exact: ["rust", "rustlang", "rust language"],
    similar: ["systems programming", "systemsprogramming"],
    related: ["memory safety", "memorysafety", "performance", "cargo"],
  },
  php: {
    exact: ["php", "php7", "php 7", "php8", "php 8"],
    similar: ["laravel", "symfony", "wordpress"],
    related: ["composer", "apache", "nginx"],
  },
  ruby: {
    exact: ["ruby", "ruby on rails", "rubyonrails", "ror"],
    similar: ["rails"],
    related: ["gems", "bundler", "rake"],
  },
  swift: {
    exact: ["swift", "swiftui", "swift ui"],
    similar: ["ios", "apple", "objective c", "objectivec"],
    related: ["xcode", "cocoa", "cocoapods"],
  },
  kotlin: {
    exact: ["kotlin", "kotlin android"],
    similar: ["java", "android"],
    related: ["android development", "androiddevelopment", "jvm"],
  },
  
  // ========== STATE MANAGEMENT ==========
  redux: {
    exact: ["redux", "reduxjs", "redux.js"],
    similar: ["zustand", "mobx", "recoil", "jotai"],
    related: ["react", "reactjs", "state management", "statemanagement"],
  },
  zustand: {
    exact: ["zustand", "zustandjs"],
    similar: ["redux", "mobx"],
    related: ["react", "reactjs", "state management"],
  },
  mobx: {
    exact: ["mobx", "mobxjs", "mobx.js"],
    similar: ["redux", "zustand"],
    related: ["react", "reactjs", "state management"],
  },
  
  // ========== STYLING ==========
  css: {
    exact: ["css", "css3", "css 3"],
    similar: ["scss", "sass", "less", "stylus"],
    related: ["html", "styling", "design"],
  },
  scss: {
    exact: ["scss", "sass", "sasscss"],
    similar: ["css", "less", "stylus"],
    related: ["styling", "preprocessor"],
  },
  tailwind: {
    exact: ["tailwind", "tailwindcss", "tailwind css", "tailwind-css"],
    similar: ["bootstrap", "bulma"],
    related: ["utility first", "utilityfirst", "css framework"],
  },
  bootstrap: {
    exact: ["bootstrap", "bootstrap css", "bootstrapcss"],
    similar: ["tailwind", "tailwindcss", "bulma"],
    related: ["css framework", "cssframework", "responsive"],
  },
  
  // ========== BUILD TOOLS ==========
  webpack: {
    exact: ["webpack", "webpackjs", "webpack.js"],
    similar: ["vite", "rollup", "parcel"],
    related: ["bundler", "build tool", "buildtool", "module bundler"],
  },
  vite: {
    exact: ["vite", "vitejs", "vite.js"],
    similar: ["webpack", "rollup", "parcel"],
    related: ["bundler", "build tool", "vue", "vuejs", "react", "reactjs"],
  },
  rollup: {
    exact: ["rollup", "rollupjs", "rollup.js"],
    similar: ["webpack", "vite"],
    related: ["bundler", "build tool"],
  },
  
  // ========== VERSION CONTROL ==========
  git: {
    exact: ["git", "git version control", "gitversioncontrol"],
    similar: ["github", "gitlab", "bitbucket"],
    related: ["version control", "versioncontrol", "source control", "sourcecontrol", "vcs"],
  },
  github: {
    exact: ["github", "github.com"],
    similar: ["git", "gitlab", "bitbucket"],
    related: ["version control", "git", "repositories", "pull requests"],
  },
  
  // ========== MOBILE ==========
  ios: {
    exact: ["ios", "iphone", "ipad", "apple ios"],
    similar: ["swift", "swiftui", "objective c", "objectivec"],
    related: ["xcode", "app store", "appstore", "cocoa"],
  },
  android: {
    exact: ["android", "android development", "androiddevelopment"],
    similar: ["kotlin", "java", "react native", "reactnative"],
    related: ["android studio", "androidstudio", "google play", "googleplay"],
  },
  
  // ========== GRAPHQL ==========
  graphql: {
    exact: ["graphql", "graph ql", "graph-ql"],
    similar: ["rest", "rest api", "restapi", "apollo", "apolloclient"],
    related: ["api", "query language", "querylanguage"],
  },
  apollo: {
    exact: ["apollo", "apollo client", "apolloclient", "apollo server", "apolloserver"],
    similar: ["graphql"],
    related: ["react", "reactjs", "vue", "vuejs"],
  },
  
  // ========== MISC ==========
  html: {
    exact: ["html", "html5", "html 5"],
    similar: ["css", "javascript", "js"],
    related: ["web development", "webdevelopment", "frontend"],
  },
  rest: {
    exact: ["rest", "rest api", "restapi", "restful", "restful api", "restfulapi"],
    similar: ["graphql", "soap"],
    related: ["api", "http", "json"],
  },
  microservices: {
    exact: ["microservices", "micro services", "micro-services"],
    similar: ["api", "rest", "graphql"],
    related: ["distributed systems", "distributedsystems", "docker", "kubernetes"],
  },
  serverless: {
    exact: ["serverless", "server less", "server-less"],
    similar: ["lambda", "aws lambda", "awslambda", "azure functions"],
    related: ["cloud", "aws", "azure", "gcp"],
  },
  
  // ========== DATA SCIENCE & ANALYTICS ==========
  "data science": {
    exact: ["data science", "datascience", "data scientist", "datascientist"],
    similar: ["machine learning", "machinelearning", "ml", "ai", "artificial intelligence", "artificialintelligence"],
    related: ["python", "r", "pandas", "numpy", "scikit learn", "scikitlearn", "tensorflow", "pytorch", "jupyter"],
  },
  "data analyst": {
    exact: ["data analyst", "dataanalyst", "data analysis", "dataanalysis", "business analyst", "businessanalyst", "ba"],
    similar: ["sql", "excel", "tableau", "power bi", "powerbi", "analytics"],
    related: ["data visualization", "datavisualization", "reporting", "dashboard", "statistics", "statistical analysis"],
  },
  pandas: {
    exact: ["pandas", "pandas python", "pandaspython"],
    similar: ["numpy", "dataframe", "data analysis"],
    related: ["python", "data science", "datascience", "data manipulation"],
  },
  numpy: {
    exact: ["numpy", "numpy python", "num python"],
    similar: ["pandas", "scipy", "mathematical computing"],
    related: ["python", "data science", "datascience", "arrays"],
  },
  scikit: {
    exact: ["scikit learn", "scikitlearn", "sklearn", "scikit-learn"],
    similar: ["machine learning", "machinelearning", "ml"],
    related: ["python", "data science", "datascience"],
  },
  tensorflow: {
    exact: ["tensorflow", "tensor flow", "tensorflowjs", "tensorflow.js"],
    similar: ["pytorch", "keras", "deep learning", "deeplearning"],
    related: ["machine learning", "machinelearning", "neural networks", "neuralnetworks"],
  },
  pytorch: {
    exact: ["pytorch", "py torch", "pytorch"],
    similar: ["tensorflow", "keras", "deep learning", "deeplearning"],
    related: ["machine learning", "machinelearning", "neural networks"],
  },
  tableau: {
    exact: ["tableau", "tableau desktop", "tableaudesktop", "tableau prep", "tableauprep"],
    similar: ["power bi", "powerbi", "qlik", "qlikview", "data visualization", "datavisualization"],
    related: ["business intelligence", "businessintelligence", "bi", "dashboard", "reporting"],
  },
  "power bi": {
    exact: ["power bi", "powerbi", "power bi desktop", "powerbidesktop", "power bi service"],
    similar: ["tableau", "qlik", "excel", "data visualization"],
    related: ["business intelligence", "businessintelligence", "bi", "microsoft", "dashboard"],
  },
  sql: {
    exact: ["sql", "structured query language", "structuredquerylanguage", "sql queries", "sqlqueries"],
    similar: ["mysql", "postgresql", "postgres", "oracle", "sql server", "sqlserver"],
    related: ["database", "rdbms", "queries", "data analysis", "dataanalysis"],
  },
  excel: {
    exact: ["excel", "microsoft excel", "microsoftexcel", "ms excel", "msexcel"],
    similar: ["spreadsheet", "vlookup", "pivot tables", "pivottables"],
    related: ["data analysis", "dataanalysis", "reporting", "analytics"],
  },
  r: {
    exact: ["r", "r language", "r programming", "rprogramming", "rstudio", "r studio"],
    similar: ["python", "statistics", "data science", "datascience"],
    related: ["statistical analysis", "statisticalanalysis", "data visualization", "datavisualization"],
  },
  jupyter: {
    exact: ["jupyter", "jupyter notebook", "jupyternotebook", "jupyter lab", "jupyterlab"],
    similar: ["python", "data science", "datascience"],
    related: ["notebook", "data analysis", "dataanalysis", "visualization"],
  },
  
  // ========== AI & MACHINE LEARNING ==========
  "machine learning": {
    exact: ["machine learning", "machinelearning", "ml", "ml engineering", "mlengineering"],
    similar: ["ai", "artificial intelligence", "artificialintelligence", "deep learning", "deeplearning"],
    related: ["python", "tensorflow", "pytorch", "scikit learn", "scikitlearn", "neural networks"],
  },
  "artificial intelligence": {
    exact: ["artificial intelligence", "artificialintelligence", "ai", "ai development", "aidevelopment", "ai engineer", "aiengineer"],
    similar: ["machine learning", "machinelearning", "ml", "deep learning", "deeplearning", "nlp", "natural language processing"],
    related: ["python", "tensorflow", "pytorch", "openai", "gpt", "llm", "large language models"],
  },
  nlp: {
    exact: ["nlp", "natural language processing", "naturallanguageprocessing", "nlp engineer", "nlpengineer"],
    similar: ["text processing", "textprocessing", "sentiment analysis", "sentimentanalysis"],
    related: ["python", "spacy", "nltk", "transformers", "bert", "gpt"],
  },
  openai: {
    exact: ["openai", "open ai", "gpt", "gpt3", "gpt 3", "gpt4", "gpt 4", "chatgpt", "chat gpt"],
    similar: ["llm", "large language models", "largelanguagemodels", "ai", "artificial intelligence"],
    related: ["machine learning", "machinelearning", "nlp", "natural language processing"],
  },
  
  // ========== BUSINESS ANALYSIS ==========
  "business analyst": {
    exact: ["business analyst", "businessanalyst", "ba", "business analysis", "businessanalysis"],
    similar: ["requirements gathering", "requirementsgathering", "stakeholder management", "stakeholdermanagement"],
    related: ["sql", "excel", "power bi", "powerbi", "tableau", "documentation", "process mapping", "processmapping"],
  },
  "requirements gathering": {
    exact: ["requirements gathering", "requirementsgathering", "requirements analysis", "requirementsanalysis", "elicitation"],
    similar: ["business analyst", "businessanalyst", "stakeholder interviews", "stakeholderinterviews"],
    related: ["documentation", "use cases", "usecases", "user stories", "userstories"],
  },
  "process mapping": {
    exact: ["process mapping", "processmapping", "business process", "businessprocess", "bpmn", "business process modeling"],
    similar: ["workflow", "process improvement", "processimprovement"],
    related: ["business analyst", "businessanalyst", "documentation"],
  },
  jira: {
    exact: ["jira", "atlassian jira", "atlassianjira"],
    similar: ["confluence", "trello", "asana", "project management", "projectmanagement"],
    related: ["agile", "scrum", "kanban", "ticket management", "ticketmanagement"],
  },
  confluence: {
    exact: ["confluence", "atlassian confluence", "atlassianconfluence"],
    similar: ["jira", "documentation", "wiki"],
    related: ["knowledge management", "knowledgemanagement", "collaboration"],
  },
  
  // ========== PRODUCT MANAGEMENT ==========
  "product manager": {
    exact: ["product manager", "productmanager", "pm", "product management", "productmanagement", "product owner", "productowner", "po"],
    similar: ["product strategy", "productstrategy", "roadmap", "product roadmap", "productroadmap"],
    related: ["agile", "scrum", "kanban", "user stories", "userstories", "prioritization", "stakeholder management"],
  },
  roadmap: {
    exact: ["roadmap", "product roadmap", "productroadmap", "product planning", "productplanning"],
    similar: ["strategy", "planning", "product vision", "productvision"],
    related: ["product manager", "productmanager", "prioritization"],
  },
  "user stories": {
    exact: ["user stories", "userstories", "user story", "userstory", "epic", "epics"],
    similar: ["requirements", "acceptance criteria", "acceptancecriteria"],
    related: ["agile", "scrum", "product manager", "productmanager"],
  },
  agile: {
    exact: ["agile", "agile methodology", "agilemethodology", "agile development", "agiledevelopment"],
    similar: ["scrum", "kanban", "sprint", "sprints"],
    related: ["product manager", "productmanager", "project management", "projectmanagement"],
  },
  scrum: {
    exact: ["scrum", "scrum master", "scrummaster", "scrum methodology", "scrummethodology"],
    similar: ["agile", "sprint", "sprints", "sprint planning", "sprintplanning"],
    related: ["product manager", "productmanager", "kanban"],
  },
  kanban: {
    exact: ["kanban", "kanban board", "kanbanboard", "kanban methodology"],
    similar: ["agile", "scrum", "lean"],
    related: ["project management", "projectmanagement", "workflow"],
  },
  
  // ========== HR & TALENT ACQUISITION ==========
  hr: {
    exact: ["hr", "human resources", "humanresources", "hr manager", "hrmanager", "hr specialist", "hrspecialist"],
    similar: ["talent acquisition", "talentacquisition", "recruiting", "recruitment"],
    related: ["employee relations", "employeerelations", "onboarding", "performance management", "performancemanagement"],
  },
  "talent acquisition": {
    exact: ["talent acquisition", "talentacquisition", "ta", "recruiting", "recruitment", "recruiter", "talent recruiter"],
    similar: ["sourcing", "candidate screening", "candidatescreening", "hiring"],
    related: ["ats", "applicant tracking system", "applicanttrackingsystem", "linkedin recruiter", "linkedinrecruiter", "job posting"],
  },
  ats: {
    exact: ["ats", "applicant tracking system", "applicanttrackingsystem", "applicant tracking", "applicanttracking"],
    similar: ["greenhouse", "lever", "workday", "bamboohr", "taleo"],
    related: ["talent acquisition", "talentacquisition", "recruiting", "hiring"],
  },
  "linkedin recruiter": {
    exact: ["linkedin recruiter", "linkedinrecruiter", "linkedin recruiting", "linkedinrecruiting"],
    similar: ["sourcing", "candidate search", "candidatesearch"],
    related: ["talent acquisition", "talentacquisition", "recruiting"],
  },
  "employee relations": {
    exact: ["employee relations", "employeerelations", "er", "employee engagement", "employeeengagement"],
    similar: ["hr", "human resources", "humanresources", "workplace culture", "workplaceculture"],
    related: ["performance management", "performancemanagement", "conflict resolution", "conflictresolution"],
  },
  onboarding: {
    exact: ["onboarding", "employee onboarding", "employeeonboarding", "new hire onboarding", "newhireonboarding"],
    similar: ["orientation", "training", "hr"],
    related: ["talent acquisition", "talentacquisition", "hr", "human resources"],
  },
  "performance management": {
    exact: ["performance management", "performancemanagement", "performance review", "performancereview", "performance appraisal"],
    similar: ["kpi", "key performance indicators", "keyperformanceindicators", "goal setting", "goalsetting"],
    related: ["hr", "human resources", "employee relations", "employeerelations"],
  },
  
  // ========== FINANCE & ACCOUNTING ==========
  finance: {
    exact: ["finance", "financial analysis", "financialanalysis", "financial analyst", "financialanalyst", "fa"],
    similar: ["accounting", "financial planning", "financialplanning", "fp&a", "fpa"],
    related: ["excel", "financial modeling", "financialmodeling", "budgeting", "forecasting"],
  },
  accounting: {
    exact: ["accounting", "accountant", "cpa", "certified public accountant", "certifiedpublicaccountant"],
    similar: ["bookkeeping", "financial reporting", "financialreporting", "gaap", "ifrs"],
    related: ["finance", "audit", "tax", "taxation"],
  },
  "financial modeling": {
    exact: ["financial modeling", "financialmodeling", "financial model", "financialmodel", "dcf", "discounted cash flow"],
    similar: ["valuation", "forecasting", "budgeting"],
    related: ["excel", "finance", "fp&a", "fpa"],
  },
  excel: {
    exact: ["excel", "microsoft excel", "microsoftexcel", "ms excel", "msexcel", "advanced excel", "advancedexcel"],
    similar: ["spreadsheet", "vlookup", "pivot tables", "pivottables", "macros", "vba"],
    related: ["data analysis", "dataanalysis", "finance", "accounting", "reporting"],
  },
  "fp&a": {
    exact: ["fp&a", "fpa", "financial planning and analysis", "financialplanningandanalysis"],
    similar: ["finance", "financial planning", "financialplanning", "budgeting", "forecasting"],
    related: ["financial modeling", "financialmodeling", "excel", "reporting"],
  },
  sap: {
    exact: ["sap", "sap erp", "saperp", "sap fico", "sapfico", "sap mm", "sapmm"],
    similar: ["erp", "enterprise resource planning", "enterpriseresourceplanning", "oracle", "oracle erp"],
    related: ["finance", "accounting", "supply chain", "supplychain"],
  },
  quickbooks: {
    exact: ["quickbooks", "quick books", "quickbooks online", "quickbooksonline", "qb"],
    similar: ["xero", "sage", "accounting software", "accountingsoftware"],
    related: ["accounting", "bookkeeping", "finance"],
  },
  
  // ========== PROJECT MANAGEMENT ==========
  "project management": {
    exact: ["project management", "projectmanagement", "pm", "project manager", "projectmanager", "pmp", "project management professional"],
    similar: ["program management", "programmanagement", "portfolio management", "portfoliomanagement"],
    related: ["agile", "scrum", "kanban", "risk management", "riskmanagement", "stakeholder management"],
  },
  pmp: {
    exact: ["pmp", "project management professional", "projectmanagementprofessional", "pmp certification", "pmpcertification"],
    similar: ["project management", "projectmanagement", "pmbok", "project management body of knowledge"],
    related: ["project manager", "projectmanager", "certification"],
  },
  "risk management": {
    exact: ["risk management", "riskmanagement", "risk assessment", "riskassessment", "risk analysis", "riskanalysis"],
    similar: ["project management", "projectmanagement", "compliance"],
    related: ["stakeholder management", "stakeholdermanagement", "mitigation"],
  },
  "stakeholder management": {
    exact: ["stakeholder management", "stakeholdermanagement", "stakeholder engagement", "stakeholderengagement"],
    similar: ["communication", "relationship management", "relationshipmanagement"],
    related: ["project management", "projectmanagement", "business analyst", "businessanalyst"],
  },
  
  // ========== SALES & MARKETING ==========
  sales: {
    exact: ["sales", "sales representative", "salesrepresentative", "account executive", "accountexecutive", "ae", "sales manager", "salesmanager"],
    similar: ["business development", "businessdevelopment", "bd", "customer acquisition", "customeracquisition"],
    related: ["crm", "customer relationship management", "customerrelationshipmanagement", "salesforce", "hubspot"],
  },
  crm: {
    exact: ["crm", "customer relationship management", "customerrelationshipmanagement"],
    similar: ["salesforce", "hubspot", "pipedrive", "zoho crm", "zohocrm"],
    related: ["sales", "marketing", "customer management", "customermanagement"],
  },
  salesforce: {
    exact: ["salesforce", "sales force", "sfdc", "salesforce crm", "salesforcecrm"],
    similar: ["crm", "customer relationship management", "customerrelationshipmanagement"],
    related: ["sales", "marketing", "cloud", "saas"],
  },
  marketing: {
    exact: ["marketing", "marketing manager", "marketingmanager", "digital marketing", "digitalmarketing"],
    similar: ["seo", "search engine optimization", "searchengineoptimization", "sem", "social media marketing", "socialmediamarketing"],
    related: ["content marketing", "contentmarketing", "email marketing", "emailmarketing", "analytics"],
  },
  seo: {
    exact: ["seo", "search engine optimization", "searchengineoptimization", "seo specialist", "seospecialist"],
    similar: ["sem", "search engine marketing", "searchenginemarketing", "ppc", "paid search"],
    related: ["google analytics", "googleanalytics", "keyword research", "keywordresearch"],
  },
  "google analytics": {
    exact: ["google analytics", "googleanalytics", "ga", "ga4", "google analytics 4", "googleanalytics4"],
    similar: ["analytics", "web analytics", "webanalytics", "data analysis", "dataanalysis"],
    related: ["seo", "marketing", "tracking", "reporting"],
  },
  
  // ========== OPERATIONS ==========
  operations: {
    exact: ["operations", "operations manager", "operationsmanager", "ops", "operational excellence", "operationalexcellence"],
    similar: ["process improvement", "processimprovement", "lean", "six sigma", "sixsigma"],
    related: ["supply chain", "supplychain", "logistics", "quality management", "qualitymanagement"],
  },
  "six sigma": {
    exact: ["six sigma", "sixsigma", "6 sigma", "6sigma", "lean six sigma", "leansixsigma"],
    similar: ["lean", "process improvement", "processimprovement", "quality management", "qualitymanagement"],
    related: ["operations", "manufacturing", "continuous improvement", "continuousimprovement"],
  },
  lean: {
    exact: ["lean", "lean methodology", "leanmethodology", "lean manufacturing", "leanmanufacturing"],
    similar: ["six sigma", "sixsigma", "kaizen", "process improvement"],
    related: ["operations", "waste reduction", "wastereduction"],
  },
  
  // ========== TECH LEAD & LEADERSHIP ==========
  "tech lead": {
    exact: ["tech lead", "techlead", "technical lead", "technicallead", "engineering lead", "engineeringlead", "team lead", "teamlead"],
    similar: ["lead engineer", "leadengineer", "senior engineer", "seniorengineer", "engineering manager", "engineeringmanager"],
    related: ["architecture", "system design", "systemdesign", "code review", "codereview", "mentoring", "leadership"],
  },
  leadership: {
    exact: ["leadership", "team leadership", "teamleadership", "people management", "peoplemanagement", "team management", "teammanagement"],
    similar: ["mentoring", "coaching", "team building", "teambuilding"],
    related: ["management", "strategy", "decision making", "decisionmaking"],
  },
  mentoring: {
    exact: ["mentoring", "mentor", "mentorship", "technical mentoring", "technicalmentoring"],
    similar: ["coaching", "training", "knowledge sharing", "knowledgesharing"],
    related: ["leadership", "team development", "teamdevelopment"],
  },
  architecture: {
    exact: ["architecture", "system architecture", "systemarchitecture", "software architecture", "softwarearchitecture", "solution architecture", "solutionarchitecture"],
    similar: ["system design", "systemdesign", "technical design", "technicaldesign"],
    related: ["tech lead", "techlead", "engineering", "scalability"],
  },
  "code review": {
    exact: ["code review", "codereview", "code reviews", "codereviews", "peer review", "peerreview"],
    similar: ["quality assurance", "qualityassurance", "qa", "testing"],
    related: ["tech lead", "techlead", "best practices", "bestpractices"],
  },
  
  // ========== SOFT SKILLS ==========
  communication: {
    exact: ["communication", "verbal communication", "verbalcommunication", "written communication", "writtencommunication"],
    similar: ["presentation", "presentation skills", "presentationskills", "public speaking", "publicspeaking"],
    related: ["stakeholder management", "stakeholdermanagement", "collaboration"],
  },
  collaboration: {
    exact: ["collaboration", "team collaboration", "teamcollaboration", "cross functional", "crossfunctional"],
    similar: ["teamwork", "team player", "teamplayer"],
    related: ["communication", "agile", "scrum"],
  },
  "problem solving": {
    exact: ["problem solving", "problemsolving", "problem solver", "problemsolver", "analytical thinking", "analyticalthinking"],
    similar: ["critical thinking", "criticalthinking", "troubleshooting"],
    related: ["analytics", "data analysis", "dataanalysis"],
  },
  "time management": {
    exact: ["time management", "timemanagement", "organizational skills", "organizationalskills"],
    similar: ["prioritization", "multitasking", "efficiency"],
    related: ["project management", "projectmanagement"],
  },
}

// Helper functions for fuzzy matching
function fuzzyNormalize(skill: string): string {
  if (!skill || typeof skill !== 'string') return ''
  return skill
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .replace(/js$/, '') // Remove trailing 'js'
    .replace(/jsx$/, '') // Remove trailing 'jsx'
    .replace(/^js/, '') // Remove leading 'js'
}

function areBaseNamesSimilar(skill1: string, skill2: string): boolean {
  const base1 = fuzzyNormalize(skill1)
  const base2 = fuzzyNormalize(skill2)
  
  if (!base1 || !base2) return false
  if (base1.length < 2 || base2.length < 2) return false
  
  // Exact base match
  if (base1 === base2) return true
  
  // One contains the other (for cases like "react" and "reactjs")
  if (base1.includes(base2) && base2.length >= 3) return true
  if (base2.includes(base1) && base1.length >= 3) return true
  
  // Levenshtein-like: if one is a prefix of the other and the difference is small
  const longer = base1.length > base2.length ? base1 : base2
  const shorter = base1.length > base2.length ? base2 : base1
  
  if (longer.startsWith(shorter) && longer.length - shorter.length <= 3) {
    return true
  }
  
  return false
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
    
    // Check if skill is mentioned in any relation (exact match in variants)
    for (const [key, relation] of Object.entries(TAG_ONTOLOGY)) {
      if (!relation || typeof relation !== 'object') continue
      const allVariants = [key, 
        ...(Array.isArray(relation.exact) ? relation.exact : []),
        ...(Array.isArray(relation.similar) ? relation.similar : []),
        ...(Array.isArray(relation.related) ? relation.related : [])
      ].filter(v => v && typeof v === 'string')
      
      // Check exact match first
      if (allVariants.some((v) => {
        const vNorm = v.toLowerCase().trim()
        return vNorm === normalized
      })) {
        return relation
      }
      
      // Check fuzzy match (base name similarity)
      if (allVariants.some((v) => {
        return areBaseNamesSimilar(v, skill)
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
    
    // Direct exact match
    if (norm1 === norm2) return true
    
    // FUZZY MATCH: Check if base names are similar (e.g., "react" vs "reactjs")
    if (areBaseNamesSimilar(skill1, skill2)) {
      return true
    }
    
    // Check if one skill is in the other's exact/similar lists
    const relation1 = findSkillInOntology(skill1)
    const relation2 = findSkillInOntology(skill2)
    
    if (relation1) {
      const all1 = [skill1, 
        ...(Array.isArray(relation1.exact) ? relation1.exact : []),
        ...(Array.isArray(relation1.similar) ? relation1.similar : [])
      ]
        .filter(s => s && typeof s === 'string')
        .map(s => s.toLowerCase().trim())
      
      // Check exact match
      if (all1.includes(norm2)) return true
      
      // Check fuzzy match with variants
      if (all1.some(variant => areBaseNamesSimilar(variant, skill2))) {
        return true
      }
    }
    
    if (relation2) {
      const all2 = [skill2,
        ...(Array.isArray(relation2.exact) ? relation2.exact : []),
        ...(Array.isArray(relation2.similar) ? relation2.similar : [])
      ]
        .filter(s => s && typeof s === 'string')
        .map(s => s.toLowerCase().trim())
      
      // Check exact match
      if (all2.includes(norm1)) return true
      
      // Check fuzzy match with variants
      if (all2.some(variant => areBaseNamesSimilar(variant, skill1))) {
        return true
      }
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
          .map(s => s.toLowerCase().trim())
        
        // Check if both skills match this ontology entry
        const skill1Matches = keyVariants.includes(norm1) || 
          keyVariants.some(v => areBaseNamesSimilar(v, skill1))
        const skill2Matches = keyVariants.includes(norm2) || 
          keyVariants.some(v => areBaseNamesSimilar(v, skill2))
        
        if (skill1Matches && skill2Matches) {
          return true
        }
      }
    }
    
    // Final fallback: if both skills normalize to the same base name
    const base1 = fuzzyNormalize(skill1)
    const base2 = fuzzyNormalize(skill2)
    if (base1 && base2 && base1 === base2 && base1.length >= 3) {
      return true
    }
  } catch (e) {
    console.warn("Error in isSimilarSkill:", e)
    return false
  }
  
  return false
}

// Get all possible variants of a skill for comprehensive matching
export function getAllSkillVariants(skill: string): string[] {
  if (!skill || typeof skill !== 'string') return []
  
  const variants = new Set<string>()
  const normalized = skill.toLowerCase().trim()
  
  // Add the original skill
  variants.add(normalized)
  
  // Add fuzzy normalized version
  const fuzzyNorm = fuzzyNormalize(skill)
  if (fuzzyNorm && fuzzyNorm !== normalized) {
    variants.add(fuzzyNorm)
  }
  
  // Find in ontology and add all variants
  const relation = findSkillInOntology(skill)
  if (relation) {
    // Add all exact matches
    if (Array.isArray(relation.exact)) {
      relation.exact.forEach(v => {
        if (v && typeof v === 'string') {
          variants.add(v.toLowerCase().trim())
        }
      })
    }
    
    // Add all similar matches
    if (Array.isArray(relation.similar)) {
      relation.similar.forEach(v => {
        if (v && typeof v === 'string') {
          variants.add(v.toLowerCase().trim())
        }
      })
    }
  }
  
  // Add common variations
  // Remove/add "js" suffix
  if (normalized.endsWith('js')) {
    variants.add(normalized.slice(0, -2))
  } else if (normalized.length > 2) {
    variants.add(normalized + 'js')
  }
  
  // Remove/add ".js" suffix
  if (normalized.endsWith('.js')) {
    variants.add(normalized.slice(0, -3))
  } else if (normalized.length > 2) {
    variants.add(normalized + '.js')
  }
  
  // Remove/add "-js" suffix
  if (normalized.endsWith('-js')) {
    variants.add(normalized.slice(0, -3))
  } else if (normalized.length > 2) {
    variants.add(normalized + '-js')
  }
  
  return Array.from(variants).filter(v => v && v.length > 0)
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

