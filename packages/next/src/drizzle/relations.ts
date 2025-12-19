import { relations } from "drizzle-orm/relations";
import { usersInAuth, doNotDelete, libraries, libraryTemplates, clients, webhookEvents, apps, appUsers, appDomains, appPagesRevisions, appsOnline, appOnlinePages, appPages, appApiKeys, libraryItems, appAssets, appFormSubmissions, appPagesOnline, appUserPlans } from "./schema";

export const doNotDeleteRelations = relations(doNotDelete, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [doNotDelete.user],
		references: [usersInAuth.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	doNotDeletes: many(doNotDelete),
	appOnlinePages: many(appOnlinePages),
}));

export const libraryTemplatesRelations = relations(libraryTemplates, ({one}) => ({
	library: one(libraries, {
		fields: [libraryTemplates.library],
		references: [libraries.id]
	}),
}));

export const librariesRelations = relations(libraries, ({one, many}) => ({
	libraryTemplates: many(libraryTemplates),
	app: one(apps, {
		fields: [libraries.app],
		references: [apps.id]
	}),
	client: one(clients, {
		fields: [libraries.client],
		references: [clients.id]
	}),
	libraryItems: many(libraryItems),
}));

export const webhookEventsRelations = relations(webhookEvents, ({one}) => ({
	client: one(clients, {
		fields: [webhookEvents.clientId],
		references: [clients.id]
	}),
}));

export const clientsRelations = relations(clients, ({many}) => ({
	webhookEvents: many(webhookEvents),
	appsOnlines: many(appsOnline),
	libraries: many(libraries),
	apps: many(apps),
	appUserPlans: many(appUserPlans),
}));

export const appUsersRelations = relations(appUsers, ({one}) => ({
	app: one(apps, {
		fields: [appUsers.app],
		references: [apps.id]
	}),
}));

export const appsRelations = relations(apps, ({one, many}) => ({
	appUsers: many(appUsers),
	appDomains: many(appDomains),
	appPagesRevisions: many(appPagesRevisions),
	appOnlinePages: many(appOnlinePages),
	appApiKeys: many(appApiKeys),
	libraries: many(libraries),
	client: one(clients, {
		fields: [apps.client],
		references: [clients.id]
	}),
	appAssets: many(appAssets),
	appFormSubmissions: many(appFormSubmissions),
	appPagesOnlines: many(appPagesOnline),
	appPages: many(appPages),
}));

export const appDomainsRelations = relations(appDomains, ({one}) => ({
	app: one(apps, {
		fields: [appDomains.app],
		references: [apps.id]
	}),
}));

export const appPagesRevisionsRelations = relations(appPagesRevisions, ({one}) => ({
	app: one(apps, {
		fields: [appPagesRevisions.app],
		references: [apps.id]
	}),
}));

export const appsOnlineRelations = relations(appsOnline, ({one}) => ({
	client: one(clients, {
		fields: [appsOnline.client],
		references: [clients.id]
	}),
}));

export const appOnlinePagesRelations = relations(appOnlinePages, ({one}) => ({
	app: one(apps, {
		fields: [appOnlinePages.app],
		references: [apps.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [appOnlinePages.currentEditor],
		references: [usersInAuth.id]
	}),
	appPage: one(appPages, {
		fields: [appOnlinePages.page],
		references: [appPages.id]
	}),
}));

export const appPagesRelations = relations(appPages, ({one, many}) => ({
	appOnlinePages: many(appOnlinePages),
	app: one(apps, {
		fields: [appPages.app],
		references: [apps.id]
	}),
	appPage: one(appPages, {
		fields: [appPages.parent],
		references: [appPages.id],
		relationName: "appPages_parent_appPages_id"
	}),
	appPages: many(appPages, {
		relationName: "appPages_parent_appPages_id"
	}),
}));

export const appApiKeysRelations = relations(appApiKeys, ({one}) => ({
	app: one(apps, {
		fields: [appApiKeys.app],
		references: [apps.id]
	}),
}));

export const libraryItemsRelations = relations(libraryItems, ({one}) => ({
	library: one(libraries, {
		fields: [libraryItems.library],
		references: [libraries.id]
	}),
}));

export const appAssetsRelations = relations(appAssets, ({one}) => ({
	app: one(apps, {
		fields: [appAssets.app],
		references: [apps.id]
	}),
}));

export const appFormSubmissionsRelations = relations(appFormSubmissions, ({one}) => ({
	app: one(apps, {
		fields: [appFormSubmissions.app],
		references: [apps.id]
	}),
}));

export const appPagesOnlineRelations = relations(appPagesOnline, ({one}) => ({
	app: one(apps, {
		fields: [appPagesOnline.app],
		references: [apps.id]
	}),
}));

export const appUserPlansRelations = relations(appUserPlans, ({one}) => ({
	client: one(clients, {
		fields: [appUserPlans.client],
		references: [clients.id]
	}),
}));