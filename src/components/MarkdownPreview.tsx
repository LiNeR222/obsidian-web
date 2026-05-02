import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// Добавляем стили для подсветки кода в index.css
import 'highlight.js/styles/github-dark.css'

interface MarkdownPreviewProps {
  content: string
}

export const MarkdownPreview = ({ content }: MarkdownPreviewProps) => {
  return (
    <div className="markdown-preview h-full overflow-auto p-6">
      <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-purple-400 prose-code:text-pink-400 prose-pre:bg-[#1a1a2e] prose-pre:border prose-pre:border-white/10">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content || '*Нет содержимого*'}
        </ReactMarkdown>
      </div>
    </div>
  )
}