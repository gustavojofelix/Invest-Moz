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
 * Route slugs are English in every locale. `/:lang` is pt | en | fr.
 * Prerendered: `/:lang`, `/:lang/guide`, `/:lang/guide/:chapter`, `/:lang/questions`,
 * `/:lang/questions/:topic`
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
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@features/landing/landing-page').then((m) => m.LandingPage),
        providers: [provideTranslocoScope('landing')],
        resolve: { scope: scopeResolver('landing'), guide: guideIndexResolver },
        data: { seo: { title: '', description: 'seo.siteDescription' } },
      },
      {
        path: 'guide',
        providers: [provideTranslocoScope('guide')],
        resolve: { scope: scopeResolver('guide'), guide: guideIndexResolver },
        children: [
          {
            path: '',
            loadComponent: () => import('@features/guide/guide-page').then((m) => m.GuidePage),
            data: { seo: { title: 'seo.guide', description: 'seo.guideDescription' } },
          },
          {
            path: ':chapter',
            resolve: { body: guideChapterResolver },
            loadComponent: () =>
              import('@features/guide/guide-chapter-page').then((m) => m.GuideChapterPage),
            data: { seo: { title: 'seo.guide', description: 'seo.guideDescription' } },
          },
        ],
      },
      {
        path: 'project',
        loadComponent: () => import('@features/intake/intake-page').then((m) => m.IntakePage),
        providers: [provideTranslocoScope('intake')],
        resolve: { scope: scopeResolver('intake') },
        data: { seo: { title: 'seo.project' } },
      },
      {
        path: 'assessment/:ref',
        loadComponent: () =>
          import('@features/assessment/assessment-page').then((m) => m.AssessmentPage),
        providers: [provideTranslocoScope('assessment')],
        resolve: { scope: scopeResolver('assessment') },
        data: { seo: { title: 'seo.assessment' } },
      },
      {
        path: 'questions',
        providers: [provideTranslocoScope('qa')],
        resolve: { scope: scopeResolver('qa'), qaData: qaDataResolver },
        children: [
          {
            path: '',
            loadComponent: () => import('@features/qa/qa-page').then((m) => m.QaPage),
            data: { seo: { title: 'seo.questions' } },
          },
          {
            path: ':topic',
            loadComponent: () => import('@features/qa/qa-page').then((m) => m.QaPage),
            data: { seo: { title: 'seo.questions' } },
          },
        ],
      },
      {
        path: 'contact',
        providers: [provideTranslocoScope('enquiry')],
        resolve: { scope: scopeResolver('enquiry') },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@features/enquiry/enquiry-page').then((m) => m.EnquiryPage),
            data: { seo: { title: 'seo.contact' } },
          },
          {
            path: 'sent/:ref',
            loadComponent: () =>
              import('@features/enquiry/enquiry-sent').then((m) => m.EnquirySent),
            data: { seo: { title: 'seo.contactSent', noindex: true } },
          },
        ],
      },
      {
        path: 'login',
        loadComponent: () => import('@features/auth/login-page').then((m) => m.LoginPage),
        providers: [provideTranslocoScope('inbox')],
        resolve: { scope: scopeResolver('inbox') },
        data: { seo: { title: 'seo.login', noindex: true } },
      },
      {
        path: 'inbox',
        canActivate: [authGuard],
        providers: [provideTranslocoScope('inbox')],
        resolve: { scope: scopeResolver('inbox') },
        data: { seo: { title: 'seo.inbox', noindex: true } },
        children: [
          {
            path: '',
            loadComponent: () => import('@features/inbox/inbox-page').then((m) => m.InboxPage),
          },
          {
            path: ':ref',
            loadComponent: () => import('@features/inbox/inbox-detail').then((m) => m.InboxDetail),
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
