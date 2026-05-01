# SRMS-26 — System Requirements

## 1. Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| FR-01 | User Authentication | The system shall allow citizens to register and log in via the mobile application using email and password credentials. |

| FR-02 | User Authentication | The system shall allow administrators to log in to the web-based admin panel with role-based authorization (admin, personnel/municipal employee). |

| FR-03 | User Authentication | The system shall manage user sessions using JWT tokens and handle logout and session expiration. |

| FR-04 | Report Submission | The mobile application shall allow authenticated users to capture a photo using the device camera or select an image from the gallery. |

| FR-05 | Report Submission | The mobile application shall automatically capture GPS coordinates at the time of report submission. |

| FR-06 | Report Submission | The mobile application shall allow users to optionally select a category and add a text description before submitting a report. Category and priority are automatically assigned by the AI pipeline; user inputs serve as optional hints for the review team and are not used in AI decision-making. |

| FR-07 | Report Submission | The system shall support a re-submission flow for failed or rejected reports. |

| FR-08 | AI Analysis Pipeline | The system shall send the submitted image to the Google Gemini API to generate a structured textual description and validate image content (filtering indoor, inappropriate, or contextless images). |

| FR-09 | AI Analysis Pipeline | The system shall pass the Gemini-generated description to the DeBERTa-v3-small classifier to predict one of 14 output classes (road_damage, sidewalk_damage, waste, pollution, green_space, lighting, traffic_sign, sewage_water, infrastructure, vandalism, stray_animal, natural_disaster, normal, irrelevant), where "normal" and "irrelevant" are internal classifier outputs not exposed as user-selectable categories. |

| FR-10 | AI Analysis Pipeline | The system shall estimate a priority score from 0 to 5 and assign the report to the relevant municipal unit. |

| FR-11 | AI Analysis Pipeline | If the classification confidence score is below 60%, the system shall automatically flag the report for manual human review. |

| FR-12 | Report Management | The backend API shall store all report data including image path, user-submitted description, user-selected category, AI-generated description, AI category, confidence score, priority, unit assignment, and review status in a relational database. |

| FR-13 | Admin Panel | The admin panel shall display summary statistics such as category distribution and report counts. |

| FR-14 | Admin Panel | The admin panel shall provide a paginated and filterable list of all submitted reports. |

| FR-15 | Admin Panel | Administrators shall be able to open report detail pages, update report status, and add notes. The detail view shall display user-submitted category alongside AI-assigned category to support review comparison. |

| FR-16 | Admin Panel | The system shall send push notifications or SMTP email alerts to admin operators when a high-priority report is submitted. |

| FR-17 | Access Control | Admin panel access shall be restricted to authorized administrator users only; mobile application access shall be restricted to registered citizen users. |

| FR-18 | Access Control | System administrators shall be able to manage employee accounts, roles, and access permissions. |

---

## 2. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | The AI analysis pipeline (Gemini API call + DeBERTa inference) shall complete within 15 seconds under normal load conditions. |

| NFR-02 | Performance | The backend API shall respond to standard CRUD requests within 2 seconds under typical load. |

| NFR-03 | Scalability | The system shall implement exponential backoff retry logic to handle Google Gemini API rate limit errors gracefully without crashing. |

| NFR-04 | Security | All API endpoints shall be protected with JWT-based authentication; tokens shall expire after a defined period. |

| NFR-05 | Security | User location data and image content shall be stored and processed in compliance with KVKK (Law No. 6698) and, where applicable, the EU GDPR. |

| NFR-06 | Security | User consent shall be explicitly obtained before collecting GPS and camera data in the mobile application. |

| NFR-07 | Portability | The mobile application shall run on both iOS and Android platforms, complying with Apple App Store and Google Play Store guidelines. |

| NFR-08 | Compatibility | The web-based admin panel shall function correctly in modern browsers (Chrome, Firefox, Edge, Safari) without requiring additional extensions or plugins. |

| NFR-09 | Reliability | The system shall implement graceful degradation: if location permission is denied, the report flow shall continue without GPS data; if camera permission is denied, the user shall be redirected to gallery access. |

| NFR-10 | Reliability | The AI classifier artifact (text_classifier_v8.pth) shall remain compatible with the system as long as the output schema is unchanged, without requiring application-level code changes upon retraining. |

| NFR-11 | Maintainability | The system shall use an ORM layer for database access so that switching between PostgreSQL and SQLite requires only configuration changes, not code rewrites. |

| NFR-12 | Maintainability | AI model training experiments shall be tracked in versioned Jupyter notebooks (v1–v11) stored in the project repository to ensure repeatability. |

| NFR-13 | Usability | The mobile application UI shall enable a citizen to submit a report within the fewest possible interaction steps from app launch to confirmation. |

| NFR-14 | Usability | The system shall support Turkish and English language interfaces; no technical expertise shall be required from citizen users. |

| NFR-15 | Resource Constraints | The DeBERTa-v3-small model shall be deployable on the target Linux VDS server within its available RAM and compute resources; CUDA GPU acceleration shall be used where available. |
