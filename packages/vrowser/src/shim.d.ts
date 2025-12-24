declare module '*.vue' {
  import { defineComponent } from 'vue'

  const component: ReturnType<typeof defineComponent>
  export default component
}

declare module '*.css' {
  const css: string
  export default css
}

declare module '*.html?raw' {
  const html: string
  export default html
}
