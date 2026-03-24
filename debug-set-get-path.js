// debug-set-get-path.js - 调试路径设置/获取问题
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

console.log('🔍 Debugging set/get path issue...\n');

const tempHome = '/tmp/pcl-debug-' + Date.now();

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: '/root/projects/pcl-context',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => stdout += data.toString());
    proc.stderr.on('data', data => stderr += data.toString());

    proc.on('close', code => {
      resolve({ stdout, stderr, code });
    });
  });
}

async function debugTest() {
  try {
    console.log('1. Setting up test environment...');
    const env = { ...process.env, PCL_HOME: tempHome };
    
    // 初始化
    await runCommand('node', ['./dist/cli.js', 'init'], { env });
    console.log('   ✅ Init completed');
    
    // 创建项目
    await runCommand('node', ['./dist/cli.js', 'project', 'create', 'demo', '--name', 'Demo Project'], { env });
    console.log('   ✅ Project created');
    
    // 检查项目文件初始状态
    const projectPath = join(tempHome, 'contexts', 'projects', 'demo.yaml');
    if (existsSync(projectPath)) {
      console.log('\n📄 Initial project file content:');
      const initialContent = readFileSync(projectPath, 'utf8');
      console.log(initialContent);
    }
    
    // 设置项目内的技术栈（使用 -p 参数）
    console.log('\n2. Testing: pcl set -p demo tech_stack.frontend.[] React');
    const setResult1 = await runCommand('node', ['./dist/cli.js', 'set', '-p', 'demo', 'tech_stack.frontend.[]', 'React'], { env });
    console.log('   Output:', setResult1.stdout.trim());
    
    // 再次检查项目文件
    if (existsSync(projectPath)) {
      console.log('\n📄 Project file after setting frontend:');
      const afterFrontend = readFileSync(projectPath, 'utf8');
      console.log(afterFrontend);
      
      const projectData = yaml.load(afterFrontend);
      console.log('\n📊 Project data after setting frontend:');
      console.log(JSON.stringify(projectData, null, 2));
    }
    
    // 设置项目内的后端技术栈
    console.log('\n3. Testing: pcl set -p demo tech_stack.backend.[] Node.js');
    const setResult2 = await runCommand('node', ['./dist/cli.js', 'set', '-p', 'demo', 'tech_stack.backend.[]', 'Node.js'], { env });
    console.log('   Output:', setResult2.stdout.trim());
    
    // 再次检查项目文件
    if (existsSync(projectPath)) {
      console.log('\n📄 Project file after setting backend:');
      const afterBackend = readFileSync(projectPath, 'utf8');
      console.log(afterBackend);
      
      const projectData = yaml.load(afterBackend);
      console.log('\n📊 Project data after setting backend:');
      console.log(JSON.stringify(projectData, null, 2));
    }
    
    // 尝试获取技术栈
    console.log('\n4. Testing: pcl get -p demo tech_stack');
    const getResult = await runCommand('node', ['./dist/cli.js', 'get', '-p', 'demo', 'tech_stack'], { env });
    console.log('   Get result:', getResult.stdout.trim());
    
    // 尝试获取整个项目
    console.log('\n5. Testing: pcl get -p demo ""');
    const getProjectResult = await runCommand('node', ['./dist/cli.js', 'get', '-p', 'demo', 'name'], { env });
    console.log('   Get name result:', getProjectResult.stdout.trim());
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  } finally {
    // Cleanup
    if (existsSync(tempHome)) {
      const { rmSync } = await import('fs');
      rmSync(tempHome, { recursive: true, force: true });
    }
  }
}

debugTest();