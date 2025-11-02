/**
 * 获取并处理最新评论数据
 * 通过Waline API获取最新评论并格式化显示
 */

// 定义评论数据接口
interface WalineComment {
  nick: string;        // 评论者昵称
  comment: string;     // 评论内容
  url: string;         // 评论页面URL
  avatar: string;      // 头像URL
  time: number;        // 评论时间戳
  like?: number;       // 点赞数
  addr?: string;       // 地址
}

// 定义API响应接口
interface WalineResponse {
  data: WalineComment[];
}

/**
 * 获取最新评论数据
 * @param limit 获取评论数量限制
 * @returns 格式化后的评论数据
 */
export async function fetchRecentComments(limit: number = 5): Promise<WalineComment[]> {
  try {
    const response = await fetch('https://waline.ljx.icu/api/comment?type=recent');
    if (!response.ok) {
      throw new Error(`获取评论失败: ${response.status}`);
    }
    
    const data: WalineResponse = await response.json();
    return data.data.slice(0, limit);
  } catch (error) {
    console.error('获取最新评论出错:', error);
    return [];
  }
}

/**
 * 格式化评论时间
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
export function formatCommentTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 一分钟内
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  // 一小时内
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  }
  
  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  }
  
  // 其他情况显示具体日期
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 清理HTML标签
 * @param html HTML字符串
 * @returns 清理后的纯文本
 */
export function stripHtml(html: string): string {
  // 使用正则表达式替代DOM操作，可在服务器端运行
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 截断文本
 * @param text 原始文本
 * @param length 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, length: number = 100): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}