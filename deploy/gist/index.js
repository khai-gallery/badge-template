'use strict'

const NOW = new Date()

const {join, parse} = require('path')

const {readFileSync, readdirSync} = require('fs')

const GitHubAPIs = require('github')

const co = require('co')

const {
  env: {
    RELEASE_GIST,
    GIST_TOKEN,
    GIST_ID,
    GIT_REPO_TAG
  },
  exit,
  stdout,
  stderr
} = require('process')

if (!RELEASE_GIST) {
  stdout.write('Skipped Gist release\n')
  exit(0)
}

if (!GIST_ID || !GIST_TOKEN) {
  stderr.write('Missing environment variables\n')
  exit(1)
}

const github = new GitHubAPIs()
const files = {}
const ENCODING = {encoding: 'utf8'}
const CONTAINER = join(__dirname, '..', '..', 'out')
const LIST = readdirSync(CONTAINER)

const filename = item => {
  const {name, ext} = parse(item)
  return name + '-' + GIT_REPO_TAG + ext
}

for (const item of LIST) {
  const content = readFileSync(join(CONTAINER, item), ENCODING)
  files[filename(item)] = {content}
}

github.authenticate({
  type: 'token',
  token: GIST_TOKEN
})

co(main)

function * main () {
  const artifactsResponse = yield github.gists.edit({
    id: GIST_ID,
    files
  })
  const rfiles = artifactsResponse.files
  const summary = LIST.reduce(
    (prev, item) => {
      const {raw_url: url, type, language} = rfiles[filename(item)]
      return prev + ` * [${item}](${url})\n  - Type: ${type}\n  - Language: ${language}\n\n`
    },
    `# Release ${GIT_REPO_TAG} - ${NOW.toISOString()}\n\n`
  )
  yield gists.edit({
    id: GIST_ID,
    files: {
      [ filename('summary.md') ]: {
        content: summary
      }
    }
  })
}
