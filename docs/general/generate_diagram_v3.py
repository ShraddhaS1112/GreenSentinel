"""
GreenSentinel — AWS Architecture Diagram (v3 — wide landscape)
Flat 3-row layout: Actors | AWS Core | Storage + External
Run: python docs/generate_diagram_v3.py
Output: docs/green_sentinel_architecture_v3.png
"""

import os
os.environ["PATH"] += os.pathsep + r"C:\Program Files\Graphviz\bin"

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.network import APIGateway, CloudFront
from diagrams.aws.storage import S3
from diagrams.aws.security import Cognito
from diagrams.aws.integration import SNS
from diagrams.aws.ml import Sagemaker
from diagrams.onprem.client import User, Client as EdgeDevice
from diagrams.saas.communication import Twilio
from diagrams.generic.network import Firewall as ExtApi

graph_attr = {
    "fontsize":  "15",
    "bgcolor":   "#F8F9FA",
    "pad":       "1.0",
    "splines":   "spline",
    "nodesep":   "1.0",
    "ranksep":   "1.4",
    "fontname":  "Helvetica Neue",
    "size":      "24,16",          # force wide canvas
    "ratio":     "fill",
}

node_attr = {
    "fontsize": "12",
    "fontname": "Helvetica Neue",
}

with Diagram(
    "GreenSentinel — Digital Immune System for Indian Agriculture",
    filename="docs/green_sentinel_architecture_v3",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
    direction="TB",
    show=False,
):
    # ── Row 1: Actors ─────────────────────────────────────────────────
    with Cluster("Users & Devices"):
        farmer   = User("Farmer\nSmartphone")
        edge_cam = EdgeDevice("CCTV\nEdge Agent")

    # ── Row 2: AWS Cloud (wide horizontal band) ───────────────────────
    with Cluster("AWS Cloud  —  ap-south-1  (Mumbai)"):

        with Cluster("Frontend"):
            cf      = CloudFront("CloudFront")
            s3fe    = S3("S3 PWA")

        with Cluster("Auth"):
            cognito = Cognito("Cognito\nPhone OTP")

        apigw = APIGateway("API Gateway")

        with Cluster("Compute"):
            api_fn   = Lambda("api-handler")
            sat_fn   = Lambda("satellite-\nprocessor")
            fore_fn  = Lambda("disease-\nforecast")
            alert_fn = Lambda("alert-sender")

        with Cluster("Bedrock AI"):
            haiku  = Sagemaker("Haiku\nStage 1")
            sonnet = Sagemaker("Sonnet v2\nStage 2")

        sns = SNS("SNS")

        with Cluster("DynamoDB"):
            farms_db  = Dynamodb("farms")
            health_db = Dynamodb("crop-health")
            alerts_db = Dynamodb("alerts")
            scans_db  = Dynamodb("scans")

        scan_s3 = S3("Scan Images")

    # ── Row 3: External ───────────────────────────────────────────────
    with Cluster("External APIs"):
        element84 = ExtApi("Element84\nSentinel-2")
        openmeteo = ExtApi("Open-Meteo\nWeather")
        twilio    = Twilio("Twilio\nWhatsApp")

    # ── Internal wiring (no labels — keeps diagram clean) ─────────────
    cf - s3fe

    apigw >> api_fn

    api_fn >> [farms_db, health_db, alerts_db, scans_db, scan_s3]
    api_fn >> haiku >> sonnet
    api_fn >> Edge(style="dashed") >> sonnet
    api_fn >> sns >> alert_fn

    sat_fn  >> health_db
    fore_fn >> [farms_db, alerts_db]

    alert_fn >> farms_db
    alert_fn >> twilio

    # ── Key inter-row flows (labelled) ────────────────────────────────
    farmer   >> Edge(color="#1565C0", label="HTTPS")          >> cf
    farmer   >> Edge(color="#6A1B9A", label="Phone OTP")      >> cognito
    farmer   >> Edge(color="#1565C0", label="API calls")      >> apigw
    edge_cam >> Edge(color="#B71C1C", label="threat-detect")  >> apigw

    sat_fn   >> Edge(color="#0277BD", label="NDVI query")     >> element84
    fore_fn  >> Edge(color="#00695C", label="weather data")   >> openmeteo
    twilio   >> Edge(color="#B71C1C", style="dashed",
                     label="WhatsApp alert")                  >> farmer

print("Saved: docs/green_sentinel_architecture_v3.png")
