// validate-data-storage.js - 验证数据存储是否正确
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

console.log('🔍 Validating data storage integrity...\n');

const tempHome = '/tmp/pcl-test-' + Date.now();

try {
  // 模拟之前测试创建的数据
  const projectPath = join('/tmp/pcl-test-1774379551475', 'contexts', 'projects', 'demo.yaml');
  
  if (existsSync(projectPath)) {
    console.log('📄 Found project file:', projectPath);
    
    const projectContent = readFileSync(projectPath, 'utf8');
    console.log('📄 Raw project content:');
    console.log(projectContent);
    
    try {
      const projectData = yaml.load(projectContent);
      console.log('\n📊 Parsed project data:');
      console.log(JSON.stringify(projectData, null, 2));
      
      // 检查技术栈字段
      if (projectData.tech_stack) {
        console.log('\n✅ Tech stack found in project data:');
        console.log('Frontend:', projectData.tech_stack.frontend);
        console.log('Backend:', projectData.tech_stack.backend);
      } else {
        console.log('\n⚠️  Tech stack not found in project data');
        console.log('Available fields:', Object.keys(projectData));
      }
    } catch (parseError) {
      console.error('❌ YAML parsing error:', parseError.message);
    }
  } else {
    console.log('❌ Project file not found at:', projectPath);
    console.log('Contents of projects dir:');
    const projectsDir = join('/tmp/pcl-test-1774379551475', 'contexts', 'projects');
    if (existsSync(projectsDir)) {
      const files = require('fs').readdirSync(projectsDir);
      console.log(files);
    }
  }

  // 检查用户配置文件
  const userProfilePath = join('/tmp/pcl-test-1774379551475', 'contexts', 'user-profile.yaml');
  if (existsSync(userProfilePath)) {
    console.log('\n👤 Found user profile file:', userProfilePath);
    const profileContent = readFileSync(userProfilePath, 'utf8');
    console.log('👤 User profile content:');
    console.log(profileContent);
  }

  console.log('\n✅ Data storage validation completed');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  console.error(error.stack);
}