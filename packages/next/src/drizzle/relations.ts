import { relations } from "drizzle-orm/relations";
import { clients, apps, appsOnline, appPages, appPagesOnline, appPagesRevisions, appAssets, appDomains, appFormSubmissions, libraries, libraryItems, libraryTemplates, appUserPlans, appUsers, appApiKeys } from "./schema";

export const appsRelations = relations(apps, ({one, many}) => ({
	client: one(clients, {
		fields: [apps.client],
		references: [clients.id]
	}),
	appPages: many(appPages),
	appPagesOnlines: many(appPagesOnline),
	appPagesRevisions: many(appPagesRevisions),
	appAssets: many(appAssets),
	appDomains: many(appDomains),
	appFormSubmissions: many(appFormSubmissions),
	libraries: many(libraries),
	appUsers: many(appUsers),
	appApiKeys: many(appApiKeys),
}));

export const clientsRelations = relations(clients, ({many}) => ({
	apps: many(apps),
	appsOnlines: many(appsOnline),
	libraries: many(libraries),
	appUserPlans: many(appUserPlans),
}));

export const appsOnlineRelations = relations(appsOnline, ({one}) => ({
	client: one(clients, {
		fields: [appsOnline.client],
		references: [clients.id]
	}),
}));

export const appPagesRelations = relations(appPages, ({one}) => ({
	app: one(apps, {
		fields: [appPages.app],
		references: [apps.id]
	}),
}));

export const appPagesOnlineRelations = relations(appPagesOnline, ({one}) => ({
	app: one(apps, {
		fields: [appPagesOnline.app],
		references: [apps.id]
	}),
}));

export const appPagesRevisionsRelations = relations(appPagesRevisions, ({one}) => ({
	app: one(apps, {
		fields: [appPagesRevisions.app],
		references: [apps.id]
	}),
}));

export const appAssetsRelations = relations(appAssets, ({one}) => ({
	app: one(apps, {
		fields: [appAssets.app],
		references: [apps.id]
	}),
}));

export const appDomainsRelations = relations(appDomains, ({one}) => ({
	app: one(apps, {
		fields: [appDomains.app],
		references: [apps.id]
	}),
}));

export const appFormSubmissionsRelations = relations(appFormSubmissions, ({one}) => ({
	app: one(apps, {
		fields: [appFormSubmissions.app],
		references: [apps.id]
	}),
}));

export const librariesRelations = relations(libraries, ({one, many}) => ({
	app: one(apps, {
		fields: [libraries.app],
		references: [apps.id]
	}),
	client: one(clients, {
		fields: [libraries.client],
		references: [clients.id]
	}),
	libraryItems: many(libraryItems),
	libraryTemplates: many(libraryTemplates),
}));

export const libraryItemsRelations = relations(libraryItems, ({one}) => ({
	library: one(libraries, {
		fields: [libraryItems.library],
		references: [libraries.id]
	}),
}));

export const libraryTemplatesRelations = relations(libraryTemplates, ({one}) => ({
	library: one(libraries, {
		fields: [libraryTemplates.library],
		references: [libraries.id]
	}),
}));

export const appUserPlansRelations = relations(appUserPlans, ({one}) => ({
	client: one(clients, {
		fields: [appUserPlans.client],
		references: [clients.id]
	}),
}));

export const appUsersRelations = relations(appUsers, ({one}) => ({
	app: one(apps, {
		fields: [appUsers.app],
		references: [apps.id]
	}),
}));

export const appApiKeysRelations = relations(appApiKeys, ({one}) => ({
	app: one(apps, {
		fields: [appApiKeys.app],
		references: [apps.id]
	}),
}));