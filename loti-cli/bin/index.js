import { program } from 'commander';
import chalk from 'chalk';
import getPort from 'get-port';
import { execSync } from 'child_process';
import open from 'open';
import fs from 'fs';
import path from 'path';

program
  .name('loti')
  .description('Manage the Local OTP Testing Infrastructure (LOTI)')
  .version('1.0.0');

// ==========================================
// COMMAND: loti init
// ==========================================
program
  .command('init')
  .description('Initialize and boot the LOTI infrastructure in the current directory')
  .option('-p, --port <number>', 'Manually specify the port for the LOTI server')
  .action(async (options) => {
    console.log(chalk.cyan('\n🚀 Initializing LOTI Infrastructure...'));

    let targetPort;

    try {
      if (options.port) {
        const requestedPort = Number(options.port);
        const availablePort = await getPort({ port: requestedPort });
        if (availablePort !== requestedPort) {
          console.log(chalk.red(`\n❌ Error: Port ${requestedPort} is already in use.`));
          process.exit(1);
        }
        targetPort = requestedPort;
      } else {
        targetPort = await getPort();
        console.log(chalk.gray(`🔍 Scanned and found random open port: ${targetPort}`));
      }

      const envPath = path.join(process.cwd(), '.env');
      const envContent = `HOST_PORT=${targetPort}\nGLOBAL_RATE_LIMIT=3\nRETRY_BACKOFF_INMS=5000`;
      fs.writeFileSync(envPath, envContent);
      console.log(chalk.green('   ✅ Created .env configuration'));

      
      const composePath = path.join(process.cwd(), 'docker-compose.yml');
      const composeContent = `
services:
  loti-server:
    image: dipayan007/loti-server:latest
    ports:
      - "\${HOST_PORT}:3000"
    depends_on:
      - redis
    env_file:
      - .env
    environment:
      - REDIS_HOST=redis
      - REDIS_URL=redis://redis:6379

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
`;
      fs.writeFileSync(composePath, composeContent.trim());
      console.log(chalk.green('   ✅ Created docker-compose.yml'));

      // Boot it up
      console.log(chalk.yellow('🐳 Pulling image and starting containers (this may take a moment)...'));
      execSync('docker-compose up -d', { stdio: 'inherit' });

      console.log(chalk.green('\n✅ LOTI Server is successfully running!'));
      
      console.log(chalk.white('\nConnect your application using the SDK:'));
      console.log(chalk.bgGray.black(`\n  const loti = new LotiClient({\n    endpoint: 'http://localhost:${targetPort}'\n  });\n`));

      console.log(chalk.cyan(`View your command center at: http://localhost:${targetPort}`));

    } catch (error) {
      console.log(chalk.red('\n❌ Failed to start infrastructure. Is Docker running?'));
      console.log(chalk.gray(error.message));
    }
  });

// ==========================================
// COMMAND: loti dashboard
// ==========================================
program
  .command('dashboard')
  .description('Open the LOTI command center in your default browser')
  .action(async () => {
    try {
      let port = 3000;
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        const portMatch = envFile.match(/HOST_PORT=(\d+)/);
        if (portMatch) port = portMatch[1];
      }
      
      console.log(chalk.cyan(`\n🌐 Opening LOTI Dashboard on port ${port}...`));
      await open(`http://localhost:${port}`);
    } catch (error) {
      console.log(chalk.red('Failed to open browser.'));
    }
  });

program.parse(process.argv);