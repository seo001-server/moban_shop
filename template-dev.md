# 模板开发文档

本文档面向需要自制模板的用户，介绍系统模板引擎的全部语法、可用数据和开发规范。

---

## 目录

1. [模板基本结构](#1-模板基本结构)
2. [目录与文件规范](#2-目录与文件规范)
3. [变量输出](#3-变量输出)
4. [指令参考](#4-指令参考)
5. [过滤器参考](#5-过滤器参考)
6. [数据查询 @query](#6-数据查询-query)
7. [URL 生成 @url](#7-url-生成-url)
8. [页面类型与上下文变量](#8-页面类型与上下文变量)
9. [内容字段参考](#9-内容字段参考)
10. [完整示例](#10-完整示例)

---

## 1. 模板基本结构

系统采用继承式模板架构，通过 `@extends` + `@section` + `@yield` 实现布局复用。

```
layout.html          ← 全局布局（头部/尾部/公共样式）
├── index.html       ← 首页
├── category.html    ← 分类列表页
├── detail.html      ← 详情页
├── play.html        ← 播放页
├── filter.html      ← 搜索/筛选页
└── page.html        ← 自定义页面（404 等）
```

### 布局继承

子模板通过 `@extends('layout')` 继承父布局，通过 `@section` 填充内容：

```html
{{-- layout.html --}}
<html>
<head><title>@yield('title', 默认标题)</title></head>
<body>
  @yield('content')
</body>
</html>
```

```html
{{-- index.html --}}
@extends('layout')

@section('title')
{{ site.title }}
@endsection

@section('content')
<div>页面内容</div>
@endsection
```

---

## 2. 目录与文件规范

模板文件放在 `template/<模板名>/` 目录下，文件扩展名为 `.html`。

| 文件 | 用途 | 必需 |
|------|------|------|
| `layout.html` | 全局布局 | 是 |
| `index.html` | 首页 | 是 |
| `category.html` | 分类列表页 | 是 |
| `detail.html` | 内容详情页 | 是 |
| `play.html` | 播放页 | 是 |
| `filter.html` | 搜索/筛选页 | 是 |
| `page.html` | 兜底页面 | 是 |
| `partials/*.html` | 可复用的局部模板 | 否 |

局部模板通过 `@include('partials/header')` 引入。

---

## 3. 变量输出

### 转义输出

```html
{{ $variable }}
{{ $item.title }}
{{ site.name }}
```

自动进行 HTML 转义，防止 XSS。

### 原始输出（不转义）

```html
{!! $variable !!}
```

适用于已确认安全的 HTML 内容（如富文本编辑器输出）。

### 带过滤器

```html
{{ $item.title | truncate(20) }}
{{ $item.time | date('2006-01-02') }}
{{ $item.actor | default('暂无') }}
```

支持链式过滤器：

```html
{{ $item.content | stripTags | truncate(100) }}
```

### 注释

```html
{{-- 这里是注释，不会输出到页面 --}}
```

---

## 4. 指令参考

所有指令以 `@` 开头，部分指令有配对的 `@end...` 结束标签。

### 4.1 布局指令

| 指令 | 说明 |
|------|------|
| `@extends('layout')` | 继承父模板 |
| `@section('name')` ... `@endsection` | 定义可填充区块 |
| `@yield('name')` | 输出对应 section 的内容 |
| `@yield('name', 默认内容)` | 带默认值的 yield |
| `@include('path')` | 引入子模板 |
| `@include('path', key='value')` | 带参数引入子模板 |

### 4.2 条件指令

```html
@if($item.score > 8)
  <span class="high-score">{{ $item.score }}</span>
@elseif($item.score > 5)
  <span class="mid-score">{{ $item.score }}</span>
@else
  <span class="low-score">{{ $item.score }}</span>
@endif
```

支持的比较运算符：`==`, `!=`, `>`, `<`, `>=`, `<=`
支持的逻辑运算符：`&&`, `||`

### 4.3 存在性判断

```html
@isset($variable)
  变量已定义且不为 nil
@endisset

@empty($variable)
  变量为空（nil、空字符串、0、空数组）
@endempty

@notempty($variable)
  变量非空
@endnotempty
```

### 4.4 循环指令

#### @foreach

```html
@foreach($list as $item)
  <div>{{ $item.title }}</div>
@endforeach
```

循环内可用 `loop` 变量：

| 变量 | 说明 |
|------|------|
| `loop.index` | 当前循环次数（从 1 开始） |
| `loop.index0` | 当前循环索引（从 0 开始） |
| `loop.first` | 是否第一次迭代 |
| `loop.last` | 是否最后一次迭代 |
| `loop.length` | 集合总长度 |

带 `@empty` 分支（集合为空时渲染）：

```html
@foreach($list as $item)
  <div>{{ $item.title }}</div>
@empty
  <div>暂无数据</div>
@endforeach
```

#### @repeat

```html
@repeat(5)
  <div class="skeleton-item"></div>
@endrepeat
```

### 4.5 数据查询指令

```html
@query('source', param1=value1, param2=$variable) as $result
  {{-- 查询结果在 $result 中，分页元数据自动注入上下文 --}}
  @foreach($result as $item)
    {{ $item.title }}
  @endforeach
@endquery
```

详见 [第 6 节](#6-数据查询-query)。

### 4.6 URL 生成指令

```html
<a href="@url('detail', $item.id)">{{ $item.title }}</a>
```

详见 [第 7 节](#7-url-生成-url)。

### 4.7 静态资源指令

```html
<link rel="stylesheet" href="@static('/css/style.css')" />
```

### 4.8 JSON 输出指令

```html
<script>
var data = @json($list);
</script>
```

将变量序列化为 JSON 输出（不转义）。

### 4.9 栈指令（CSS/JS 注入）

在布局中定义占位位置：

```html
<head>
  @stack('head')
</head>
<body>
  ...
  @stack('scripts')
</body>
```

在子模板中向栈推入内容：

```html
@push('head')
<style>.custom { color: red }</style>
@endpush

@push('scripts')
<script>console.log('loaded')</script>
@endpush
```

> 注意：SEO 标签（title/keywords/description）已由系统通过后台「SEO设置」自动处理，模板中**不需要**用 `@push('head')` 注入 SEO 标签。

### 4.10 区域指令

```html
@zone('sidebar')
  <div>默认侧边栏</div>
@endzone
```

`@zone` 可由系统在渲染时替换内容（如泛内容注入），模板内写的是默认回退内容。

---

## 5. 过滤器参考

过滤器通过管道符 `|` 应用于变量输出。

### 字符串过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `upper` | 转大写 | `{{ $s \| upper }}` |
| `lower` | 转小写 | `{{ $s \| lower }}` |
| `truncate(n)` | 截断到 n 个字符 | `{{ $s \| truncate(50) }}` |
| `truncate(n, '...')` | 自定义截断后缀 | `{{ $s \| truncate(50, '…') }}` |
| `trim` | 去除首尾空白 | `{{ $s \| trim }}` |
| `replace('a', 'b')` | 替换字符串 | `{{ $s \| replace('/', '-') }}` |
| `contains('x')` | 是否包含子串（返回布尔） | 用于 `@if` |
| `repeat(n)` | 重复 n 次 | `{{ $s \| repeat(3) }}` |
| `nl2br` | 换行转 `<br>` | `{{ $s \| nl2br }}` |
| `stripTags` | 去除 HTML 标签 | `{{ $s \| stripTags }}` |
| `escape` | HTML 转义 | `{{ $s \| escape }}` |
| `raw` | 标记不转义（输出原始值） | `{{ $s \| raw }}` |
| `md5` | 计算 MD5 哈希 | `{{ $s \| md5 }}` |
| `urlencode` | URL 编码 | `{{ $s \| urlencode }}` |

### 数值过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `number` | 千分位格式化 | `{{ $n \| number }}` → `1,234` |
| `abs` | 绝对值 | `{{ $n \| abs }}` |

### 日期过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `date` | 格式化日期（Go 格式） | `{{ $t \| date('2006-01-02') }}` |
| `date('01/02')` | 自定义格式 | `{{ $t \| date('01/02') }}` |
| `ago` | 相对时间（如"3天前"） | `{{ $t \| ago }}` |

Go 日期格式参考值：`2006` 年，`01` 月，`02` 日，`15` 时，`04` 分，`05` 秒。

### 集合过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `length` | 数组长度或字符串字符数 | `{{ $list \| length }}` |
| `first` | 取第一个元素 | `{{ $list \| first }}` |
| `last` | 取最后一个元素 | `{{ $list \| last }}` |
| `reverse` | 反转数组或字符串 | `{{ $list \| reverse }}` |
| `sort` | 排序（预留） | |
| `keys` | 取 Map 的键列表 | `{{ $map \| keys }}` |
| `values` | 取 Map 的值列表 | `{{ $map \| values }}` |
| `split(',')` | 按分隔符拆分为数组 | `{{ $s \| split(',') }}` |
| `join(', ')` | 数组拼接为字符串 | `{{ $list \| join(', ') }}` |

### 序列化过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `json` | 序列化为 JSON 字符串 | `{{ $data \| json }}` |
| `default('值')` | 为空时使用默认值 | `{{ $s \| default('无') }}` |

### 拼音过滤器

| 过滤器 | 说明 | 示例 |
|--------|------|------|
| `pinyin` | 中文转拼音（空格分隔） | `{{ $s \| pinyin }}` → `zhong guo ren` |
| `pinyin('-')` | 中文转拼音（自定义分隔符） | `{{ $s \| pinyin('-') }}` → `zhong-guo-ren` |
| `pinyinx` | 中文转拼音，保留英文和数字 | `{{ $s \| pinyinx }}` → `zhong guo ren ABC` |
| `pinyinx('-')` | 同上，自定义分隔符 | `{{ $s \| pinyinx('-') }}` → `zhong-guo-ren-ABC` |
| `initials` | 取拼音首字母，保留英文数字 | `{{ $s \| initials }}` → `zgrABC` |

---

## 6. 数据查询 @query

`@query` 是模板中获取数据的核心指令。

### 基本语法

```html
@query('数据源', 参数1=值1, 参数2=值2) as $变量名
  {{-- 查询结果可用 --}}
@endquery
```

- 数据源名称和参数值都支持引号包裹（单引号或双引号），也可以不加引号。
- `as` 关键字大小写不敏感。

### 可用数据源

| 数据源 | 说明 | 别名 |
|--------|------|------|
| `contents` | 内容列表（自动解析当前模块） | `vod` |
| `detail` | 内容详情 | |
| `categories` | 分类列表 | `category` |
| `actors` | 演员列表（按 `vod_ids` 作品数降序） | `actor_list` |
| `links` | 友情链接 | `friend_links` |

`actors` 支持 `page`、`limit`（默认 20，最大 200），不解读 `order`；分页元数据与 `contents` 相同（`$total`、`$total_pages` 等）。

### 通用参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `limit` | 每页数量 | 10 |
| `page` | 页码 | 1 |
| `offset` | 偏移量（与 page 二选一） | 0 |
| `order` | 排序（如 `vod_time DESC`） | 模块默认排序 |
| `category_id` | 分类 ID | - |
| `keyword` | 搜索关键词 | - |

### 筛选参数（contents 数据源）

| 参数 | 说明 | 匹配方式 |
|------|------|----------|
| `year` | 年份 | 精确匹配 |
| `area` | 地区 | 精确匹配 |
| `lang` | 语言 | 精确匹配 |
| `class` | 分类/类型 | 模糊匹配 (LIKE) |

### 分页元数据

`@query` 查询内容列表时，以下分页变量自动注入到 `@query` 块的上下文中：

| 变量 | 说明 |
|------|------|
| `$total` | 总记录数 |
| `$total_pages` | 总页数 |
| `$page` | 当前页码 |
| `$limit` | 每页数量 |
| `$prev_page` | 上一页页码 |
| `$next_page` | 下一页页码 |
| `$has_more` | 是否有更多（搜索模式下可用） |

### 查询示例

```html
{{-- 最新影片，每页 10 条 --}}
@query('contents', limit=10) as $latest
  @foreach($latest as $item)
    <a href="@url('detail', $item.id)">{{ $item.title }}</a>
  @endforeach
@endquery

{{-- 热门排行 --}}
@query('contents', limit=10, order='vod_hits DESC') as $hot
  @foreach($hot as $item)
    {{ loop.index }}. {{ $item.title }}
  @endforeach
@endquery

{{-- 按分类查询 --}}
@query('contents', category_id=$category_id, page=$page, limit=20) as $list
  @foreach($list as $item)
    {{ $item.title }}
  @endforeach
@endquery

{{-- 详情查询 --}}
@query('detail', id=$id) as $info
  <h1>{{ $info.title }}</h1>
  <p>{{ $info.summary }}</p>
@endquery

{{-- 分类列表 --}}
@query('categories') as $cats
  @foreach($cats as $cat)
    @if($cat.pid == 0)
      <a href="@url('category', $cat.id)">{{ $cat.name }}</a>
    @endif
  @endforeach
@endquery

{{-- 友情链接 --}}
@query('links') as $links
  @foreach($links as $link)
    <a href="{{ $link.url }}">{{ $link.name }}</a>
  @endforeach
@endquery
```

### 查询无数据时的行为

当 `@query` 返回空结果或出错时，整个 `@query ... @endquery` 块的内容将被跳过，不会渲染。可以利用这一行为来安全地处理可能不存在的数据。

---

## 7. URL 生成 @url

`@url` 根据路由类型和参数生成对应的 URL，自动处理 URL 后缀等配置。

### 语法

```html
@url('路由类型', 参数1, 参数2, ...)
```

### 路由类型

| 类型 | 参数 | 生成 URL 格式 |
|------|------|---------------|
| `index` | 无 | `/` |
| `category` | 分类ID | `/category/{id}` |
| `category` | 分类ID, 页码 | `/category/{id}/{page}` |
| `detail` | 内容ID | `/detail/{id}` |
| `play` | 内容ID | `/play/{id}` |
| `play` | 内容ID, 集数 | `/play/{id}/{ep}` |
| `filter` | 筛选值 | `/show/{value}` |
| `search` | 关键词 | `/search?wd={keyword}` |

### 示例

```html
<a href="@url('index')">首页</a>
<a href="@url('category', $cat.id)">{{ $cat.name }}</a>
<a href="@url('category', $cat.id, 2)">第 2 页</a>
<a href="@url('detail', $item.id)">{{ $item.title }}</a>
<a href="@url('play', $item.id, $ep.index)">播放</a>
```

---

## 8. 页面类型与上下文变量

每种页面类型在渲染时，路由层会自动注入一组上下文变量供模板使用。

### 公共变量（所有页面可用）

| 变量 | 类型 | 说明 |
|------|------|------|
| `site.id` | int | 站点 ID |
| `site.name` | string | 站点名称 |
| `site.domain` | string | 站点域名 |
| `site.title` | string | SEO 标题 |
| `site.keywords` | string | SEO 关键词 |
| `site.description` | string | SEO 描述 |
| `site.logo` | string | Logo URL |
| `site.icp` | string | 备案号 |
| `settings` | map | 后台设置键值对 |
| `$seo_title` | string | 当前页面 SEO 标题（由后台配置自动生成） |
| `$seo_keywords` | string | 当前页面 SEO 关键词（由后台配置自动生成） |
| `$seo_description` | string | 当前页面 SEO 描述（由后台配置自动生成） |

### SEO 标题/关键词/描述

系统会根据后台「SEO设置」中配置的占位符模板，自动为每个页面生成 `$seo_title`、`$seo_keywords`、`$seo_description`。

layout.html 中已内置了 SEO 渲染逻辑：当 `$seo_title` 存在时优先使用，否则回退到 `@yield('title')` 的默认值。**模板开发者无需手动处理 SEO 标签**。

后台可配置的占位符：

| 占位符 | 说明 | 适用页面 |
|--------|------|----------|
| `{vod_name}` | 影视名称 | 详情页、播放页 |
| `{vod_class}` | 类型/分类 | 详情页、播放页 |
| `{vod_area}` | 地区 | 详情页、播放页 |
| `{vod_year}` | 年份 | 详情页、播放页 |
| `{vod_actor}` | 演员 | 详情页、播放页 |
| `{vod_director}` | 导演 | 详情页、播放页 |
| `{vod_blurb}` | 简介（截取前150字） | 详情页、播放页 |
| `{vod_score}` | 评分 | 详情页、播放页 |
| `{vod_remarks}` | 备注 | 详情页、播放页 |
| `{vod_lang}` | 语言 | 详情页、播放页 |
| `{site_name}` | 站点名称 | 所有页面 |
| `{site_title}` | 站点标题 | 所有页面 |
| `{category_name}` | 当前分类名 | 分类页 |
| `{keyword}` | 搜索关键词 | 搜索页 |
| `{page}` | 当前页码 | 分类页、搜索页 |

后台配置示例：

| 页面 | 标题 | 关键词 | 描述 |
|------|------|--------|------|
| 详情页 | `{vod_name}在线观看 - {site_name}` | `{vod_name},{vod_class},{vod_actor},在线观看` | `{site_name}为您提供{vod_name}在线观看，{vod_blurb}` |
| 播放页 | `正在播放{vod_name} - {site_name}` | `{vod_name}在线播放,{vod_name}免费观看` | `{site_name}提供{vod_name}高清在线播放` |
| 分类页 | `{category_name} - {site_title}` | `{category_name},{site_name}` | `{category_name}频道 - {site_name}` |
| 搜索页 | `搜索:{keyword} - {site_title}` | `{keyword},{site_name}` | `搜索{keyword}的相关影片` |

### index.html（首页）

无额外变量。首页数据通过 `@query` 自行查询。

### category.html（分类页）

| 变量 | 类型 | 说明 |
|------|------|------|
| `$category_id` | string | 当前分类 ID |
| `$category_name` | string | 当前分类名称 |
| `$page` | string | 当前页码（URL 中的） |
| `$area` | string | 筛选地区（URL 参数） |
| `$year` | string | 筛选年份（URL 参数） |
| `$lang` | string | 筛选语言（URL 参数） |
| `$class` | string | 筛选类型（URL 参数） |
| `$filter_areas` | array | 后台配置的地区选项列表 |
| `$filter_years` | array | 后台配置的年份选项列表 |
| `$filter_langs` | array | 后台配置的语言选项列表 |

### detail.html（详情页）

| 变量 | 类型 | 说明 |
|------|------|------|
| `$id` | string | 内容 ID |
| `$detail` | map | 预查询的内容详情数据（同 @query('detail') 返回的字段） |

内容数据通过 `@query('detail', id=$id)` 查询。`$detail` 由路由层预注入，用于 SEO 标签渲染。

### play.html（播放页）

| 变量 | 类型 | 说明 |
|------|------|------|
| `$id` | string | 内容 ID |
| `$ep` | string | 当前集数/播放源索引 |
| `$detail` | map | 预查询的内容详情数据 |

### filter.html（搜索/筛选页）

| 变量 | 类型 | 说明 |
|------|------|------|
| `$keyword` | string | 搜索关键词（来自 `?wd=` 参数） |
| `$page` | string | 当前页码（来自 `?page=` 参数） |

### page.html（自定义页面）

| 变量 | 类型 | 说明 |
|------|------|------|
| `$slug` | string | URL 路径（如访问 `/about` 则 slug 为 `about`） |

---

## 9. 内容字段参考

### 列表查询字段

通过 `@query('contents')` 查询到的每条记录包含以下字段：

| 模板字段 | 说明 | 示例值 |
|----------|------|--------|
| `id` | 内容 ID | `123` |
| `type_id` | 所属分类 ID | `1` |
| `title` | 标题 | `流浪地球2` |
| `slug` | 英文名/URL slug | `the-wandering-earth-2` |
| `cover` | 封面图 URL | `https://...jpg` |
| `summary` | 简介 | `近未来时代...` |
| `remarks` | 备注（如更新状态） | `HD`, `更新至8集` |
| `time` | 更新时间（时间戳） | `1700000000` |
| `views` | 播放量 | `12345` |
| `year` | 年份 | `2023` |
| `area` | 地区 | `中国大陆` |
| `class` | 分类/类型 | `科幻,冒险` |
| `score` | 评分 | `8.5` |
| `actor` | 演员 | `吴京,刘德华` |
| `director` | 导演 | `郭帆` |
| `lang` | 语言 | `国语` |

### 详情查询额外字段

通过 `@query('detail', id=$id)` 查询时，除上述字段外还包含：

| 模板字段 | 说明 | 示例值 |
|----------|------|--------|
| `content` | 完整介绍（HTML） | `<p>影片讲述了...</p>` |
| `play_from` | 播放来源 | `hnm3u8$$$` |
| `play_url` | 原始播放地址 | `第1集$url#第2集$url` |
| `episodes` | 解析后的播放列表（数组） | 见下方 |
| `tag` | 标签 | `科幻,冒险` |
| `state` | 状态 | `正片` |
| `serial` | 连载数 | `8` |
| `total` | 总集数 | `12` |
| `isend` | 是否完结 | `1` |

### episodes 结构

`episodes` 是一个二维数组，外层按播放源分组：

```
episodes[0]           ← 第一个播放源
  episodes[0][0]      ← 第一集
    .name             ← 集名（如"第1集"）
    .url              ← 播放地址
```

使用示例：

```html
@query('detail', id=$id) as $info
  @foreach($info.episodes as $source)
    <div class="ep-list">
      @foreach($source as $ep)
        <a href="@url('play', $info.id, $ep.index)">{{ $ep.name }}</a>
      @endforeach
    </div>
  @endforeach
@endquery
```

### 分类字段

通过 `@query('categories')` 查询的分类包含：

| 字段 | 说明 |
|------|------|
| `id` | 分类 ID |
| `pid` | 父分类 ID（0 = 顶级分类） |
| `name` | 分类名称 |
| `en_name` | 英文名称 |

### 友情链接字段

通过 `@query('links')` 查询的链接包含：

| 字段 | 说明 |
|------|------|
| `name` | 链接名称 |
| `url` | 链接地址 |
| `logo` | Logo URL |
| `group` | 分组名称 |

---

## 10. 完整示例

### 首页骨架

```html
@extends('layout')

@section('title')
{{ site.title }}
@endsection

@section('content')
<div class="container">

  {{-- 最新更新 --}}
  @query('contents', limit=10) as $latest
    <div class="section-title"><h2>最新更新</h2></div>
    <div class="content-grid">
      @foreach($latest as $item)
        <a href="@url('detail', $item.id)" class="content-card">
          <div class="poster">
            <img src="{{ $item.cover }}" alt="{{ $item.title }}" loading="lazy" />
            @notempty($item.remarks)
              <span class="tag">{{ $item.remarks }}</span>
            @endnotempty
          </div>
          <div class="info">
            <h3>{{ $item.title }}</h3>
            <div class="meta">{{ $item.year }} · {{ $item.area }}</div>
          </div>
        </a>
      @endforeach
    </div>
  @endquery

  {{-- 热播排行 --}}
  @query('contents', limit=10, order='vod_hits DESC') as $hot
    <div class="section-title"><h2>热播排行</h2></div>
    <div class="content-grid">
      @foreach($hot as $item)
        <a href="@url('detail', $item.id)" class="content-card">
          <div class="poster">
            <img src="{{ $item.cover }}" alt="{{ $item.title }}" loading="lazy" />
          </div>
          <div class="info">
            <h3>{{ $item.title }}</h3>
          </div>
        </a>
      @endforeach
    </div>
  @endquery

</div>
@endsection
```

### 分类页带筛选栏

```html
@extends('layout')

@section('content')
<div class="container">

  <div class="filter-bar">
    {{-- 地区筛选 --}}
    @if($filter_areas.length > 0)
      <div class="filter-row">
        <span class="label">地区</span>
        <div class="opts" data-filter="area">
          <a href="#" data-val="" class="@empty($area)active@endempty">全部</a>
          @foreach($filter_areas as $a)
            <a href="#" data-val="{{ $a }}" class="@if($area == $a)active@endif">{{ $a }}</a>
          @endforeach
        </div>
      </div>
    @endif
  </div>

  @query('contents', category_id=$category_id, area=$area, year=$year, lang=$lang, class=$class, page=$page, limit=24) as $list
    <div class="content-grid">
      @foreach($list as $item)
        <a href="@url('detail', $item.id)" class="content-card">
          <div class="poster">
            <img src="{{ $item.cover }}" alt="{{ $item.title }}" loading="lazy" />
          </div>
          <div class="info">
            <h3>{{ $item.title }}</h3>
          </div>
        </a>
      @endforeach
    </div>

    {{-- 分页 --}}
    @if($total_pages > 1)
      <div class="pagination">
        @if($page > 1)
          <a href="@url('category', $category_id, $prev_page)">&lsaquo;</a>
        @endif
        <span class="active">{{ $page }}</span>
        <span>/ {{ $total_pages }}</span>
        @if($page < $total_pages)
          <a href="@url('category', $category_id, $next_page)">&rsaquo;</a>
        @endif
      </div>
    @endif
  @endquery

</div>
@endsection
```

### 详情页

```html
@extends('layout')

@section('title')
{{ $info.title }} - {{ site.title }}
@endsection

@section('content')
@query('detail', id=$id) as $info
  <div class="detail-header">
    <div class="poster">
      <img src="{{ $info.cover }}" alt="{{ $info.title }}" />
    </div>
    <div class="info">
      <h1>{{ $info.title }}</h1>
      @notempty($info.director)
        <div class="meta-row"><span class="label">导演</span>{{ $info.director }}</div>
      @endnotempty
      @notempty($info.actor)
        <div class="meta-row"><span class="label">主演</span>{{ $info.actor | truncate(80) }}</div>
      @endnotempty
      <div class="meta-row">
        <span class="label">类型</span>{{ $info.year }} / {{ $info.area }} / {{ $info.class }}
      </div>
      @notempty($info.summary)
        <div class="summary">{{ $info.summary }}</div>
      @endnotempty
    </div>
  </div>

  {{-- 播放列表 --}}
  @notempty($info.episodes)
    <div class="detail-section">
      <h2>播放列表</h2>
      @foreach($info.episodes as $source)
        <div class="ep-list">
          @foreach($source as $ep)
            <a href="@url('play', $info.id, $ep.index)">{{ $ep.name }}</a>
          @endforeach
        </div>
      @endforeach
    </div>
  @endnotempty
@endquery
@endsection
```

---

## 附录：注意事项

1. **变量未定义时**：引用未定义的变量会输出空字符串，不会报错。在 `@query` 参数中引用未定义的变量时，该参数会被跳过不传递。

2. **缓存**：页面渲染结果会被缓存。筛选参数（area/year/lang/class）会纳入缓存 key，不同筛选组合会产生独立缓存。

3. **安全**：
   - `{{ }}` 输出默认 HTML 转义
   - `@query` 的 `order` 参数有 SQL 注入防护白名单，只允许 `列名 ASC/DESC` 格式
   - 搜索关键词和筛选参数经过 Guard 白名单校验

4. **性能**：避免在循环内嵌套 `@query`，这会导致 N+1 查询问题。尽量在外层一次查询所有需要的数据。
