'use strict';

const {execSync, spawn} = require('child_process');
const fs = require('fs');
const {wait} = require('./utils');
const kill = require('tree-kill');
const autocannon = require('autocannon');
const chalk = require('chalk');
const debug = require('debug')('perf-bot');

const cannon = (port, url) => {
  return new Promise((resolve, reject) => {
    autocannon({
      url: `http://127.0.0.1:${port}${url}`,
      connections: 8,
      pipelining: 1,
      duration: 10
    }, (err, results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });
  })
};


(async () => {
  const frameworks = require('./frameworks').frameworks;
  for (const fw of frameworks) {
    let {cwd, name, command, url, port, delay, exit, skip} = fw;

    if (skip) {
      continue;
    }

    if (!fs.existsSync(cwd)) {
      console.error(`Directory ${cwd} doesn't exist! Skipping...`);
      continue;
    }

    command  = command.split(/\s+/);
    const cmd = command.shift();
    const args  = command;
    let child = spawn(cmd, args, {cwd});

    child.on('error', err => {
      console.error(err);
    });

    child.on('exit', (code, signal) => {
      debug(`Exited with code ${code} and signal ${signal}`);
    });

    child.stdout.on('data', (data) => {
      debug(data.toString());
    });

    child.stderr.on('data', (data) => {
      debug(data.toString());
    });

    console.log(`Waiting for ${name} to initialize...`);
    await wait(delay || 5000); // wait for workers to properly initialize
    console.log(`Running benchmark on ${name}...`);
    let results = await cannon(port, url);
    console.log(chalk.whiteBright.bold(`${name} QPS:  ${results.requests.average}`));
    if (exit) {
      execSync(`${exit} >/dev/null 2>&1`, {cwd});
    } else {
      kill(child.pid);
    }
  }
})().catch(e => console.error(e));
