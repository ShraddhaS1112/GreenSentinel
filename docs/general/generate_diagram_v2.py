"""
GreenSentinel — AWS Architecture Diagram (v2 — clean layout)
Left-to-right flow, minimal edge labels, no overlapping lines.
Run: python docs/generate_diagram_v2.py
Output: docs/green_sentinel_architecture_v2.png
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
    "fontsize":  "13",
    "bgcolor":   "white",
    "pad":       "0.8",
    "splines":   "curved",
    "nodesep":   "0.8",
    "ranksep":   "1.2",
    "fontname":  "Helvetica",
}

node_attr = {
    "fontsize": "11",
    "fontname": "Helvetica",
}

with Diagram(
    "GreenSentinel — Digital Immune System for Indian Agriculture",
    filename="docs/green_sentinel_architecture_v2",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
    direction="LR",
    show=False,
):
    # ── Left: Actors ──────────────────────────────────────────────────
    farmer   = User("Farmer\nSmartphone")
    edge_cam = EdgeDevice("Edge Agent\nCCTV Camera")

    # ── Centre-left: Entry Points ─────────────────────────────────────
    with Cluster("Entry Points"):
        cf      = CloudFront("CloudFront\nCDN")
        cognito = Cognito("Cognito\nPhone OTP")
        apigw   = APIGateway("API Gateway\nREST /dev")

    # ── Centre: AWS Compute ───────────────────────────────────────────
    with Cluster("AWS Lambda  (ap-south-1)"):
        api_fn   = Lambda("api-handler\n22 routes")
        sat_fn   = Lambda("satellite-\nprocessor")
        fore_fn  = Lambda("disease-\nforecast")
        alert_fn = Lambda("alert-\nsender")

    # ── Centre-right: AI ──────────────────────────────────────────────
    with Cluster("AWS Bedrock  (APAC)"):
        haiku  = Sagemaker("Claude 3\nHaiku\nStage 1")
        sonnet = Sagemaker("Claude 3.5\nSonnet v2\nStage 2")

    # ── Right: Storage ────────────────────────────────────────────────
    with Cluster("Storage"):
        farms_db  = Dynamodb("farms")
        alerts_db = Dynamodb("alerts")
        health_db = Dynamodb("crop-health")
        scans_db  = Dynamodb("disease-scans")
        scan_s3   = S3("scan-images\nS3")

    # ── Messaging ─────────────────────────────────────────────────────
    sns = SNS("SNS\nalert-topic")

    # ── Right: External APIs ──────────────────────────────────────────
    with Cluster("External  (free tier)"):
        element84 = ExtApi("Element84\nSentinel-2 NDVI")
        openmeteo = ExtApi("Open-Meteo\nWeather")
        twilio    = Twilio("Twilio\nWhatsApp")

    # ── Flows ─────────────────────────────────────────────────────────

    # Farmer entry
    farmer   >> Edge(color="#2196F3", label="HTTPS")     >> cf
    farmer   >> Edge(color="#9C27B0", label="OTP")       >> cognito
    farmer   >> Edge(color="#2196F3")                    >> apigw
    edge_cam >> Edge(color="#F44336", label="/threat-detect") >> apigw

    # API routing
    apigw >> Edge(color="#FF9800") >> api_fn

    # api-handler → storage
    api_fn >> Edge(color="#4CAF50") >> farms_db
    api_fn >> Edge(color="#4CAF50") >> alerts_db
    api_fn >> Edge(color="#4CAF50") >> health_db
    api_fn >> Edge(color="#4CAF50") >> scans_db
    api_fn >> Edge(color="#4CAF50") >> scan_s3

    # api-handler → Bedrock (two-stage)
    api_fn >> Edge(color="#7B2D8B", label="triage")      >> haiku
    haiku  >> Edge(color="#7B2D8B", style="dashed",
                   label="escalate")                     >> sonnet
    api_fn >> Edge(color="#7B2D8B", label="disease scan") >> sonnet

    # api-handler → SNS
    api_fn >> Edge(color="#F44336") >> sns

    # Satellite pipeline
    sat_fn  >> Edge(color="#03A9F4") >> element84
    sat_fn  >> Edge(color="#03A9F4") >> health_db

    # Disease forecast pipeline
    fore_fn >> Edge(color="#009688") >> openmeteo
    fore_fn >> Edge(color="#009688") >> farms_db
    fore_fn >> Edge(color="#009688") >> alerts_db

    # Alert pipeline
    sns      >> Edge(color="#F44336")                    >> alert_fn
    alert_fn >> Edge(color="#F44336")                    >> farms_db
    alert_fn >> Edge(color="#F44336", label="WhatsApp")  >> twilio
    twilio   >> Edge(color="#F44336", style="dashed",
                     label="delivery")                   >> farmer

print("Saved: docs/green_sentinel_architecture_v2.png")
