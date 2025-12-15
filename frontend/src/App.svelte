<script>
  import { onMount, onDestroy } from "svelte";
  import Home from "./pages/Home.svelte";
  import Forums from "./pages/Forums.svelte";
  import ForumView from "./pages/ForumView.svelte";
  import ReadView from "./pages/ReadView.svelte";
  import Bookmarks from "./pages/Bookmarks.svelte";
  import HistoryPage from "./pages/History.svelte";
  import GlossaryPage from "./pages/GlossaryPage.svelte";
  import LoginPage from "./pages/LoginPage.svelte";
  import SearchPage from "./pages/SearchPage.svelte";
  import NotFound from "./pages/NotFound.svelte";

  const routes = [
    { match: /^\/?$/, component: Home, title: "NGA Forums - Favorites" },
    { match: /^\/forums\/?$/, component: Forums, title: "All Forums - NGA" },
    {
      match: /^\/history\/?$/,
      component: HistoryPage,
      title: "Reading History - NGA",
    },
    {
      match: /^\/bookmarks\/?$/,
      component: Bookmarks,
      title: "Bookmarked Threads - NGA",
    },
    { match: /^\/login\/?$/, component: LoginPage, title: "Login - NGA" },
    {
      match: /^\/glossary\/?$/,
      component: GlossaryPage,
      title: "Glossary - NGA",
    },
    {
      match: /^\/forum\/([^/?#]+)\/?$/,
      component: ForumView,
      title: "Forum Threads",
      props: (match) => ({ fid: decodeURIComponent(match[1]) }),
    },
    {
      match: /^\/thread\/([^/?#]+)\/?$/,
      component: ReadView,
      title: "Thread",
      props: (match) => ({ tid: decodeURIComponent(match[1]) }),
    },
    {
      match: /^\/search\/?$/,
      component: SearchPage,
      title: "Search Results",
      props: () => ({
        keyword: new URLSearchParams(window.location.search).get("q") || "",
      }),
    },
  ];

  const resolveRoute = (pathname) => {
    for (const route of routes) {
      const match = pathname.match(route.match);
      if (match) {
        return {
          component: route.component,
          title: route.title,
          props: route.props ? route.props(match) : {},
        };
      }
    }
    return { component: NotFound, title: "Page Not Found", props: {} };
  };

  let currentPath = window.location.pathname;
  let current = resolveRoute(currentPath);
  let currentComponent = current.component;
  let currentProps = current.props;
  let pageTitle = current.title || "NGA Forums";

  const handlePop = () => {
    currentPath = window.location.pathname;
    current = resolveRoute(currentPath);
    currentComponent = current.component;
    currentProps = current.props;
    pageTitle = current.title || "NGA Forums";
  };

  onMount(() => {
    window.addEventListener("popstate", handlePop);
  });

  onDestroy(() => {
    window.removeEventListener("popstate", handlePop);
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<!-- Bootstrap Navbar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container">
    <a class="navbar-brand" href="/">
      <i class="fa-solid fa-comments"></i> NGA Forums
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ms-auto">
        <li class="nav-item">
          <a class="nav-link" href="/">
            <i class="fa-solid fa-house"></i> Home
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/forums">
            <i class="fa-solid fa-table-cells"></i> Forums
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/history">
            <i class="fa-solid fa-clock-rotate-left"></i> History
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/bookmarks">
            <i class="fa-solid fa-bookmark"></i> Bookmarks
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/glossary">
            <i class="fa-solid fa-book"></i> Glossary
          </a>
        </li>
        <!-- Auth status will be injected here by auth.js -->
      </ul>

      <!-- Search Form -->
      <form class="d-flex ms-3" id="search-form" role="search">
        <input class="form-control form-control-sm me-2" type="search" id="search-input" placeholder="Search..." aria-label="Search" style="min-width: 200px;">
        <button class="btn btn-outline-light btn-sm" type="submit">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </form>
    </div>
  </div>
</nav>

<!-- Main Content -->
<main class="container my-5">
  <svelte:component this={currentComponent} {...currentProps} />
</main>

<!-- Footer -->
<footer class="bg-light text-center py-4 mt-5">
  <div class="container">
    <p class="text-muted mb-0">&copy; 2025 NGA Forums</p>
  </div>
</footer>

<style>
  /* Styles are defined in app.css */
</style>
