import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { localeMatchGuard, localeResolver, scopeResolver } from '@core/i18n/i18n.resolvers';
import { LocaleService } from '@core/i18n/locale.service';
import { Shell } from '@core/layout/shell';
import { authGuard } from '@features/auth/auth.guard';
import { guideChapterResolver, guideIndexResolver } from '@features/guide/guide-data.resolver';
import { qaDataResolver } from '@features/qa/qa-data.resolver';

/**
 * Route slugs are English in every locale. `/:lang` is one of the eight LOCALES.
 * `data.chrome` picks the page chrome: `site` (default), `app` (full-screen
 * mobile screens) or `office` (back office). See RouteChrome.
 *
 * The 23 screens of the Tiva screen pack:
 *   web front door   1 landing (''), 2 roadmap PDF (roadmap/:ref/pdf)
 *   investor journey 3 welcome, 4 pathfinder, 5 chat, 6 roadmap, 7 map, 8 incentives,
 *                    9 expert, 10 expert/sent/:ref
 *   tools, channels  11 library, 12 library/:chapter, 13 documents, 14 directory,
 *                    15 aftercare, 16 alerts, 17 whatsapp
 *   back office      18 office/queue, 19 office/knowledge-base, 20 office/conversations,
 *                    21 office/leads, 22 office/intelligence, 23 office/partners
 *
 * Prerendered: `/:lang`, `/:lang/library`, `/:lang/library/:chapter`
 * (see app.routes.server.ts). Everything else renders on the client.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => `/${inject(LocaleService).storedPreference() ?? 'pt'}`,
  },
  {
    path: ':lang',
    canMatch: [localeMatchGuard],
    component: Shell,
    resolve: { i18n: localeResolver },
    children: [
      // 1 · Landing
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@features/landing/landing-page').then((m) => m.LandingPage),
        providers: [provideTranslocoScope('landing')],
        resolve: { scope: scopeResolver('landing') },
        data: { seo: { title: '', description: 'seo.siteDescription' } },
      },
      // 3 · Welcome and language
      {
        path: 'welcome',
        loadComponent: () => import('@features/welcome/welcome-page').then((m) => m.WelcomePage),
        providers: [provideTranslocoScope('welcome')],
        resolve: { scope: scopeResolver('welcome') },
        data: { chrome: 'app', seo: { title: 'seo.welcome' } },
      },
      // 4 · Investment Pathfinder
      {
        path: 'pathfinder',
        loadComponent: () =>
          import('@features/pathfinder/pathfinder-page').then((m) => m.PathfinderPage),
        providers: [provideTranslocoScope('pathfinder')],
        resolve: { scope: scopeResolver('pathfinder') },
        data: { seo: { title: 'seo.pathfinder' } },
      },
      // 5 · Chat with Tiva
      {
        path: 'chat',
        loadComponent: () => import('@features/chat/chat-page').then((m) => m.ChatPage),
        providers: [provideTranslocoScope('chat')],
        resolve: { scope: scopeResolver('chat'), qaData: qaDataResolver },
        data: { chrome: 'app', seo: { title: 'seo.chat' } },
      },
      // 6 · Investment roadmap, 2 · Roadmap PDF export
      {
        path: 'roadmap',
        providers: [provideTranslocoScope('roadmap')],
        resolve: { scope: scopeResolver('roadmap') },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@features/roadmap/roadmap-page').then((m) => m.RoadmapPage),
            data: { seo: { title: 'seo.roadmap' } },
          },
          {
            path: ':ref',
            loadComponent: () =>
              import('@features/roadmap/roadmap-page').then((m) => m.RoadmapPage),
            data: { seo: { title: 'seo.roadmap' } },
          },
          {
            path: ':ref/pdf',
            loadComponent: () =>
              import('@features/roadmap/roadmap-pdf').then((m) => m.RoadmapPdfPage),
            data: { chrome: 'app', seo: { title: 'seo.roadmapPrint', noindex: true } },
          },
        ],
      },
      // 7 · Opportunity map
      {
        path: 'map',
        loadComponent: () => import('@features/map/map-page').then((m) => m.MapPage),
        providers: [provideTranslocoScope('map')],
        resolve: { scope: scopeResolver('map') },
        data: { seo: { title: 'seo.map' } },
      },
      // 8 · Incentive estimator
      {
        path: 'incentives',
        loadComponent: () =>
          import('@features/incentives/incentives-page').then((m) => m.IncentivesPage),
        providers: [provideTranslocoScope('incentives')],
        resolve: { scope: scopeResolver('incentives') },
        data: { seo: { title: 'seo.incentives' } },
      },
      // 9 · Talk to an expert, 10 · Call requested
      {
        path: 'expert',
        providers: [provideTranslocoScope('expert')],
        resolve: { scope: scopeResolver('expert') },
        children: [
          {
            path: '',
            loadComponent: () => import('@features/expert/expert-page').then((m) => m.ExpertPage),
            data: { seo: { title: 'seo.expert' } },
          },
          {
            path: 'sent/:ref',
            loadComponent: () =>
              import('@features/expert/expert-sent').then((m) => m.ExpertSentPage),
            data: { seo: { title: 'seo.expertSent', noindex: true } },
          },
        ],
      },
      // 11 · Knowledge library, 12 · Library article
      {
        path: 'library',
        providers: [provideTranslocoScope('library')],
        resolve: { scope: scopeResolver('library'), guide: guideIndexResolver },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@features/library/library-page').then((m) => m.LibraryPage),
            data: { seo: { title: 'seo.library', description: 'seo.libraryDescription' } },
          },
          {
            path: ':chapter',
            resolve: { body: guideChapterResolver },
            loadComponent: () =>
              import('@features/library/library-article').then((m) => m.LibraryArticlePage),
            data: { seo: { title: 'seo.library', description: 'seo.libraryDescription' } },
          },
        ],
      },
      // 13 · Documents and forms
      {
        path: 'documents',
        loadComponent: () =>
          import('@features/documents/documents-page').then((m) => m.DocumentsPage),
        providers: [provideTranslocoScope('documents')],
        resolve: { scope: scopeResolver('documents') },
        data: { seo: { title: 'seo.documents' } },
      },
      // 14 · Ecosystem directory
      {
        path: 'directory',
        loadComponent: () =>
          import('@features/directory/directory-page').then((m) => m.DirectoryPage),
        providers: [provideTranslocoScope('directory')],
        resolve: { scope: scopeResolver('directory') },
        data: { seo: { title: 'seo.directory' } },
      },
      // 15 · Aftercare calendar
      {
        path: 'aftercare',
        loadComponent: () =>
          import('@features/aftercare/aftercare-page').then((m) => m.AftercarePage),
        providers: [provideTranslocoScope('aftercare')],
        resolve: { scope: scopeResolver('aftercare') },
        data: { seo: { title: 'seo.aftercare' } },
      },
      // 16 · Regulatory watch
      {
        path: 'alerts',
        loadComponent: () => import('@features/alerts/alerts-page').then((m) => m.AlertsPage),
        providers: [provideTranslocoScope('alerts')],
        resolve: { scope: scopeResolver('alerts') },
        data: { seo: { title: 'seo.alerts' } },
      },
      // 17 · WhatsApp channel
      {
        path: 'whatsapp',
        loadComponent: () => import('@features/whatsapp/whatsapp-page').then((m) => m.WhatsappPage),
        providers: [provideTranslocoScope('whatsapp')],
        resolve: { scope: scopeResolver('whatsapp'), qaData: qaDataResolver },
        data: { chrome: 'app', seo: { title: 'seo.whatsapp' } },
      },
      // Back-office sign-in (demo credentials)
      {
        path: 'login',
        loadComponent: () => import('@features/auth/login-page').then((m) => m.LoginPage),
        providers: [provideTranslocoScope('office')],
        resolve: { scope: scopeResolver('office') },
        data: { seo: { title: 'seo.login', noindex: true } },
      },
      // 18–23 · Back office
      {
        path: 'office',
        canActivate: [authGuard],
        loadComponent: () => import('@features/office/office-layout').then((m) => m.OfficeLayout),
        providers: [provideTranslocoScope('office')],
        resolve: { scope: scopeResolver('office') },
        data: { chrome: 'office', seo: { title: 'seo.office', noindex: true } },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'queue' },
          {
            path: 'queue',
            loadComponent: () =>
              import('@features/office/validation-queue').then((m) => m.ValidationQueuePage),
          },
          {
            path: 'knowledge-base',
            loadComponent: () =>
              import('@features/office/knowledge-base').then((m) => m.KnowledgeBasePage),
          },
          {
            path: 'conversations',
            loadComponent: () =>
              import('@features/office/conversation-review').then((m) => m.ConversationReviewPage),
          },
          {
            path: 'leads',
            loadComponent: () => import('@features/office/leads-page').then((m) => m.LeadsPage),
          },
          {
            path: 'leads/:ref',
            loadComponent: () =>
              import('@features/office/lead-detail').then((m) => m.LeadDetailPage),
          },
          {
            path: 'intelligence',
            loadComponent: () =>
              import('@features/office/intelligence-page').then((m) => m.IntelligencePage),
          },
          {
            path: 'partners',
            loadComponent: () =>
              import('@features/office/partners-page').then((m) => m.PartnersPage),
          },
        ],
      },
      {
        path: 'demo',
        providers: [provideTranslocoScope('demo')],
        resolve: { scope: scopeResolver('demo') },
        data: { seo: { title: 'seo.demo', noindex: true } },
        children: [
          {
            path: '',
            loadComponent: () => import('@features/demo/demo-page').then((m) => m.DemoPage),
          },
          {
            path: 'ui',
            loadComponent: () => import('@features/demo/style-guide').then((m) => m.StyleGuide),
            data: { seo: { title: 'seo.styleGuide', noindex: true } },
          },
        ],
      },
      // Addresses from the earlier Invest Moz prototype.
      { path: 'guide', redirectTo: 'library' },
      { path: 'guide/:chapter', redirectTo: 'library/:chapter' },
      { path: 'project', redirectTo: 'pathfinder' },
      { path: 'assessment/:ref', redirectTo: 'roadmap/:ref' },
      { path: 'questions', redirectTo: 'chat' },
      { path: 'questions/:topic', redirectTo: 'chat' },
      { path: 'contact', redirectTo: 'expert' },
      { path: 'contact/sent/:ref', redirectTo: 'expert/sent/:ref' },
      { path: 'inbox', redirectTo: 'office/leads' },
      { path: 'inbox/:ref', redirectTo: 'office/leads/:ref' },
      {
        path: '**',
        loadComponent: () => import('@features/landing/not-found').then((m) => m.NotFound),
        data: { seo: { title: 'seo.notFound', noindex: true } },
      },
    ],
  },
  {
    path: '**',
    redirectTo: () => inject(Router).parseUrl('/pt'),
  },
];
