// 页面内错误提示条（替代浏览器 alert：金色描边 + 朱砂「提示」印章）
export default function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span className="vermilion-seal shrink-0">提示</span>
      <span>{message}</span>
    </div>
  );
}