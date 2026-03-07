# Civis (Defcon Global Monitor) - Systemdokumentation

**Stand:** Februar 2026
**Zweck:** Civis ist ein hochspezialisiertes, webbasiertes System zur Erfassung, Verwaltung und Visualisierung von Personen, deren hierarchischen Gruppenzugehörigkeiten und komplexen sozialen Beziehungsgeflechten. 

Das System ist in einem futuristischen "Military/Cyberpunk HUD"-Benutzeroberflächen-Design gehalten, welches eine Kommandozentrale simuliert.

---

## 1. 🛡️ Benutzerverwaltung, Sicherheit & Rollen
Das System ist durch ein Authentifizierungs-Backend (JSON Web Tokens - JWT) geschützt und bietet fein abgestufte Zugriffsrechte durch verschiedene Benutzerrollen:

*   **Authentifizierung:** Jeder Zugriff auf die API und das Frontend erfordert einen gültigen Login.
*   **Rollen-System:**
    *   **Admin:** Hat volle Kontrolle über das System. Darf Personen anlegen, bearbeiten, löschen und andere Benutzerkonten verwalten.
    *   **Editor:** Darf Personen und Gruppen anlegen sowie bestehende Datenpunkte bearbeiten, aber keine Accounts verwalten oder sensible Löschungen durchführen.
    *   **Viewer (Read-Only):** Darf das Dashboard einsehen und Profile betrachten, hat jedoch keinen Zugriff auf die Editier-Werkzeuge.

---

## 2. 🎛️ Dashboard & UI/UX (Military HUD)
Die gesamte Benutzeroberfläche ist darauf ausgelegt, wie ein fortschrittliches Überwachungssystem auszusehen.

*   **Design-Sprache:** Ein dunkles Theme mit harten Kontrasten, scharfen Ecken (abgerundet wo nötig), Neon-Farben (Blau, Orange, Grün, Rot, Violett) und einer Monospace-Schriftart für alle Daten.
*   **Optische Effekte:** Ein permanenter Grid-Hintergrund und feine Scanlines (wie bei einem alten Röhrenmonitor) verfeinern das Hacking/Terminal-Feeling.
*   **Live-Statistiken:** Direkte Anzeige der Anzahl aller registrierten Entitäten (Personen), aktiven Gruppen und der berechneten Querverbindungen.
*   **Globale Suchfunktion:** Eine persistente, animierte Suchleiste, um in Echtzeit nach spezifischen Personen oder Decknamen in der ganzen Datenbank zu filtern.
*   **Weltkarten-Visualisierung:** Ein rotierender Globus rundet das Monitor-Theme visuell ab.

---

## 3. 👤 Personen- & Entitäten-Verwaltung 
Die Erfassung von Personen erfolgt nicht über ein statisches Formular, sondern über ein vollmodulares Editor-System.

*   **Dynamischer Profil-Editor:** 
    * Beim Hinzufügen einer Person öffnet sich ein Editor, der standardmäßig nur den Namen abfragt.
    * Über ein Dropdown-Menü können selektiv Module ("Allgemein" oder "Verbindungen") zugeschaltet werden.
*   **Basis-Module (Allgemein):**
    *   **Geburtsdatum:** Das Backend/Frontend errechnet aus dem Datum automatisch das aktuelle Alter.
    *   **Geschlecht:** Zur Erfassung und für die Berechnungslogik der Beziehungen (siehe Punkt 4).
    *   **Alias:** Speicherung von Deck-, Spitz- oder Codenamen.
    *   **Wohnort:** Aktueller Aufenthaltsort oder Basis.
    *   **Zusätzliche Infos:** Ein generisches Textfeld für detaillierte Hintergrund-Dossiers.
*   **Detailansicht (Personenprofil):** 
    * Alle aktiven Modulelemente der Person werden als separate HUD-Gitter-Widgets gerendert.
    * Leere oder nicht verknüpfte Informationen werden intelligent ausgeblendet.

---

## 4. 🔗 Intelligente Beziehungs-Engine
Das absolute Kernstück von Civis. Anstatt Personen nur starr als Text aneinanderzureihen, verknüpft das System sie durch programmatische IDs und berechnet automatisch Gegenrollen.

*   **Drei Kategorien von Verbindungen:**
    *   **Familie**
    *   **Beziehung/Partner**
    *   **Soziales Umfeld**
*   **Spezifischer Beziehungsstatus:**
    Wird eine Person verknüpft, wählt der Nutzer aus einem Dropdown aus, WAS diese Person für die aktuelle Person ist. 
    *   *Beispiel Familie:* Vater, Mutter, Sohn, Tochter, Bruder, Schwester, Großmutter, Großvater.
    *   *Beispiel Beziehung:* Dating, Ehepartner, Verlobt, Ex-Partner, Feste Beziehung.
    *   *Beispiel Soziales Umfeld:* Bester Freund, Nachbar, Mitbewohner.
*   **Automatische Symmetrie-Kalkulation (Auto-Reverse):**
    Das Backend analysiert Verbindungen bidirektional und unter Einbezug des Geschlechts.
    *   *Szenario:* Du erstellst "Tim" (Männlich) und fügst ihm "Max" als "Vater" hinzu.
    *   *Magie des Backends:* Das System erkennt das und speichert bei "Max" vollautomatisch ab, dass "Tim" sein "Sohn" ist.
    *   Entfernst du bei einem die Verbindung oder updatest du den Status, korrigiert das Backend automatisch den Eintrag beim Counterpart.
*   **Verlinkte Widgets:** In der Detailansicht werden verlinkte Personen leuchtend pulsierend dargestellt. Ein Klick darauf führt direkt zum Dossier der Gegenperson.

---

## 5. 🏢 Hierarchische Gruppenstrukturen
Personen können Organisationen oder Teams zugeordnet werden.

*   **Unendliche Verschachtelung:** Gruppen unterstützen eine Parent-Child-Struktur. Du kannst Untergruppen von Untergruppen erstellen.
*   **Dynamische Graphen-Ausgabe:** Wenn eine Person einer Untergruppe (`Squad Alpha`) zugewiesen ist, die zur Hauptgruppe (`Konzern X`) gehört, generiert Civis automatisch visuelle Pfade wie `Konzern X > Squad Alpha` anstatt nur den isolierten Gruppennamen zu zeigen.

---

## Zusammenfassung des Tech-Stacks
*   **Frontend-Client:** React, React Router, TailwindCSS (mit globalen CSS-Variablen für das HUD-Thema), Lucide-React für Icons, Framer-Motion für aufwendige UI-Animationen, Vite als Bundler.
*   **Backend-API:** Node.js, Express, JSON Web Token (JWT) für Authentifizierung.
*   **Datenbank:** SQLite mit asynchronen Wrapper-Modulen, um performante JOINS zwischen den unzähligen Beziehungsbrücken der Personen zu ermöglichen.
