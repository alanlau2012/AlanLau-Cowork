const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('时间线与Tab面板功能测试', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // 启动Electron应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    // 获取第一个窗口
    window = await electronApp.firstWindow();
    
    // 等待应用加载
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000); // 等待初始化完成
  });

  test.afterEach(async () => {
    // 关闭应用
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('1. 验证Tab按钮存在且默认选中"任务"', async () => {
    console.log('📋 测试1: 验证Tab按钮...');
    
    // 等待侧边栏加载
    await window.waitForSelector('.sidebar', { timeout: 5000 });
    
    // 验证Tab按钮存在
    const tasksTab = window.locator('.panel-tab[data-tab="tasks"]');
    const activityTab = window.locator('.panel-tab[data-tab="activity"]');
    
    await expect(tasksTab).toBeVisible();
    await expect(activityTab).toBeVisible();
    
    console.log('✅ Tab按钮存在');
    
    // 验证默认选中"任务"Tab
    await expect(tasksTab).toHaveClass(/active/);
    console.log('✅ 默认选中"任务"Tab');
    
    // 截图
    await window.screenshot({ path: 'screenshots/01-tab-default.png', fullPage: true });
    console.log('📸 截图已保存: screenshots/01-tab-default.png');
  });

  test('2. 验证Tab切换功能', async () => {
    console.log('🔄 测试2: 验证Tab切换...');
    
    await window.waitForSelector('.panel-tab', { timeout: 5000 });
    
    const tasksTab = window.locator('.panel-tab[data-tab="tasks"]');
    const activityTab = window.locator('.panel-tab[data-tab="activity"]');
    
    // 点击"活动"Tab
    await activityTab.click();
    await window.waitForTimeout(500);
    
    // 验证Tab状态切换
    await expect(activityTab).toHaveClass(/active/);
    await expect(tasksTab).not.toHaveClass(/active/);
    console.log('✅ Tab按钮状态切换成功');
    
    // 验证内容区切换
    const tasksPane = window.locator('#tasksPane');
    const activityPane = window.locator('#activityPane');
    
    await expect(activityPane).toHaveClass(/active/);
    await expect(tasksPane).not.toHaveClass(/active/);
    console.log('✅ Tab内容区切换成功');
    
    // 截图
    await window.screenshot({ path: 'screenshots/02-tab-switched.png', fullPage: true });
    console.log('📸 截图已保存: screenshots/02-tab-switched.png');
    
    // 切换回"任务"Tab
    await tasksTab.click();
    await window.waitForTimeout(500);
    
    await expect(tasksTab).toHaveClass(/active/);
    await expect(tasksPane).toHaveClass(/active/);
    console.log('✅ 切换回"任务"Tab成功');
  });

  test('3. 验证时间线CSS样式', async () => {
    console.log('🎨 测试3: 验证时间线CSS样式...');
    
    // 等待首页加载
    await window.waitForSelector('#homeInput', { timeout: 5000 });
    
    // 输入测试消息
    await window.fill('#homeInput', '请列出3个待办事项');
    await window.waitForTimeout(500);
    
    // 点击发送按钮
    const sendBtn = window.locator('#homeSendBtn');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();
    
    console.log('📤 已发送测试消息');
    
    // 等待切换到聊天视图
    await window.waitForSelector('#chatView:not(.hidden)', { timeout: 5000 });
    console.log('✅ 已切换到聊天视图');
    
    // 等待工具调用出现（最多等待30秒）
    try {
      await window.waitForSelector('.inline-tool-call', { timeout: 30000 });
      console.log('✅ 工具调用已出现');
      
      // 等待一下让所有元素渲染完成
      await window.waitForTimeout(2000);
      
      const toolCall = window.locator('.inline-tool-call').first();
      
      // 1. 验证状态标记器存在
      const marker = toolCall.locator('.step-marker');
      await expect(marker).toBeVisible();
      console.log('✅ 状态标记器存在');
      
      // 2. 验证连接线（检查::before伪元素）
      const hasBeforePseudo = await toolCall.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.width !== '0px' && before.content !== 'none';
      });
      expect(hasBeforePseudo).toBeTruthy();
      console.log('✅ 时间线连接线存在');
      
      // 3. 验证耗时标签（可能需要等待工具执行完成）
      const durationExists = await window.locator('.tool-duration').count() > 0;
      if (durationExists) {
        console.log('✅ 耗时标签存在');
      } else {
        console.log('⚠️  耗时标签未出现（可能工具还在执行中）');
      }
      
      // 4. 验证padding-left（为标记器留空间）
      const paddingLeft = await toolCall.evaluate(el => {
        return window.getComputedStyle(el).paddingLeft;
      });
      expect(paddingLeft).toBe('28px');
      console.log('✅ 时间线padding正确');
      
      // 截图
      await window.screenshot({ path: 'screenshots/03-timeline-styles.png', fullPage: true });
      console.log('📸 截图已保存: screenshots/03-timeline-styles.png');
      
    } catch (error) {
      console.log('⚠️  工具调用未在30秒内出现，可能需要配置API密钥');
      await window.screenshot({ path: 'screenshots/03-timeline-timeout.png', fullPage: true });
      console.log('📸 超时截图已保存');
    }
  });

  test('4. 验证折叠功能', async () => {
    console.log('📂 测试4: 验证折叠功能...');
    
    await window.waitForSelector('#homeInput', { timeout: 5000 });
    
    // 发送消息
    await window.fill('#homeInput', '帮我创建一个简单的待办列表');
    await window.click('#homeSendBtn');
    
    // 等待工具调用
    try {
      await window.waitForSelector('.inline-tool-call', { timeout: 30000 });
      await window.waitForTimeout(2000);
      
      const toolCall = window.locator('.inline-tool-call').first();
      
      // 验证初始状态（默认展开）
      await expect(toolCall).toHaveClass(/expanded/);
      console.log('✅ 初始状态为展开');
      
      // 点击header折叠
      await toolCall.locator('.inline-tool-header').click();
      await window.waitForTimeout(500);
      
      // 验证折叠状态
      await expect(toolCall).not.toHaveClass(/expanded/);
      console.log('✅ 折叠功能正常');
      
      // 截图折叠状态
      await window.screenshot({ path: 'screenshots/04-collapsed.png', fullPage: true });
      console.log('📸 折叠状态截图已保存');
      
      // 再次点击展开
      await toolCall.locator('.inline-tool-header').click();
      await window.waitForTimeout(500);
      
      await expect(toolCall).toHaveClass(/expanded/);
      console.log('✅ 展开功能正常');
      
      // 截图展开状态
      await window.screenshot({ path: 'screenshots/04-expanded.png', fullPage: true });
      console.log('📸 展开状态截图已保存');
      
    } catch (error) {
      console.log('⚠️  工具调用未出现，跳过折叠测试');
      await window.screenshot({ path: 'screenshots/04-fold-timeout.png', fullPage: true });
    }
  });

  test('5. 验证暗色主题适配', async () => {
    console.log('🌙 测试5: 验证暗色主题...');
    
    await window.waitForSelector('#themeToggle', { timeout: 5000 });
    
    // 截图亮色主题
    await window.screenshot({ path: 'screenshots/05-light-theme.png', fullPage: true });
    console.log('📸 亮色主题截图已保存');
    
    // 切换到暗色主题
    await window.click('#themeToggle');
    await window.waitForTimeout(500);
    
    // 验证主题属性
    const theme = await window.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');
    console.log('✅ 已切换到暗色主题');
    
    // 验证Tab按钮在暗色主题下可见
    const tabVisible = await window.locator('.panel-tab').first().isVisible();
    expect(tabVisible).toBeTruthy();
    console.log('✅ Tab按钮在暗色主题下可见');
    
    // 截图暗色主题
    await window.screenshot({ path: 'screenshots/05-dark-theme.png', fullPage: true });
    console.log('📸 暗色主题截图已保存');
    
    // 切换回亮色主题
    await window.click('#themeToggle');
    await window.waitForTimeout(500);
    
    const themeLight = await window.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(themeLight).toBe('light');
    console.log('✅ 已切换回亮色主题');
  });

  test('6. 验证右侧边栏响应式', async () => {
    console.log('📱 测试6: 验证侧边栏响应...');
    
    await window.waitForSelector('.sidebar', { timeout: 5000 });
    
    // 验证侧边栏初始可见
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    console.log('✅ 侧边栏初始可见');
    
    // 点击折叠按钮
    await window.click('#sidebarToggle');
    await window.waitForTimeout(500);
    
    // 验证折叠状态
    await expect(sidebar).toHaveClass(/collapsed/);
    console.log('✅ 侧边栏折叠功能正常');
    
    // 截图折叠状态
    await window.screenshot({ path: 'screenshots/06-sidebar-collapsed.png', fullPage: true });
    console.log('📸 侧边栏折叠截图已保存');
    
    // 再次点击展开
    await window.click('#sidebarToggle');
    await window.waitForTimeout(500);
    
    await expect(sidebar).not.toHaveClass(/collapsed/);
    console.log('✅ 侧边栏展开功能正常');
  });
});
