"""
GreenSentinel — AWS Architecture Diagram
Generated with the Python `diagrams` library using official AWS icons.
Run: python docs/generate_diagram.py
Output: docs/green_sentinel_architecture.png
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
from diagrams.aws.ml import Sagemaker  # used as Bedrock proxy
from diagrams.onprem.client import User, Client as EdgeDevice
from diagrams.saas.communication import Twilio
from diagrams.generic.network import Firewall as ExternalAPI

graph_attr = {
    "fontsize": "14",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.6",
    "ranksep": "0.9",
}

output_path = "docs/green_sentinel_architecture"

with Diagram(
    "GreenSentinel — Digital Immune System for Indian Agriculture",
    filename=output_path,
    outformat="png",
    graph_attr=graph_attr,
    direction="TB",
    show=False,
):

    # ── Actors ────────────────────────────────────────────────────────
    farmer    = User("Farmer\n(Smartphone / Browser)")
    edge_cam  = EdgeDevice("Edge Agent\nCCTV / IP Camera")

    # ── External APIs ─────────────────────────────────────────────────
    with Cluster("External APIs"):
        element84  = ExternalAPI("Element84 STAC\nSentinel-2 NDVI")
        openmeteo  = ExternalAPI("Open-Meteo\nWeather Data")
        twilio_wa  = Twilio("Twilio\nWhatsApp Business")

    # ── AWS Cloud ─────────────────────────────────────────────────────
    with Cluster("AWS  ap-south-1  (Mumbai)"):

        # CDN
        with Cluster("Frontend Delivery"):
            cf  = CloudFront("CloudFront\nE7IN6ZTW0EXV5")
            s3f = S3("S3 Bucket\nReact PWA + SW")
            cf >> Edge(style="dashed") >> s3f

        # Auth
        with Cluster("Authentication"):
            cognito   = Cognito("Cognito User Pool\nPhone OTP")
            pre_auth  = Lambda("Pre-Auth Lambda\nOTP trigger")
            post_conf = Lambda("Post-Confirm Lambda\nUser bootstrap")
            cognito >> pre_auth
            cognito >> post_conf

        # API
        apigw = APIGateway("API Gateway\nREST  /dev")

        # Compute
        with Cluster("Lambda Functions"):
            api_handler     = Lambda("api-handler\n22+ routes")
            sat_proc        = Lambda("satellite-processor\nScheduled NDVI")
            disease_forecast = Lambda("disease-forecast\nDaily risk score")
            alert_sender    = Lambda("alert-sender\nSNS subscriber")

        # AI
        with Cluster("AWS Bedrock  (APAC Claude)"):
            haiku   = Sagemaker("Claude 3 Haiku\nFast threat triage")
            sonnet  = Sagemaker("Claude 3.5 Sonnet v2\nDisease + deep threat")

        # Storage
        with Cluster("DynamoDB Tables"):
            farms_db   = Dynamodb("farms")
            alerts_db  = Dynamodb("alerts")
            health_db  = Dynamodb("crop-health")
            scans_db   = Dynamodb("disease-scans")

        # S3 Data
        scan_s3 = S3("S3 Bucket\nScan Images")

        # Messaging
        sns = SNS("SNS Topic\nalert-topic")

    # ── Flows ─────────────────────────────────────────────────────────

    # Farmer → App
    farmer    >> Edge(label="HTTPS")          >> cf
    farmer    >> Edge(label="Phone OTP")      >> cognito
    farmer    >> Edge(label="JWT Bearer")     >> apigw

    # Edge → API
    edge_cam  >> Edge(label="POST /threat-detect\nbase64 frame") >> apigw

    # API → Lambda
    apigw     >> api_handler

    # API handler → Storage
    api_handler >> Edge(label="CRUD")         >> farms_db
    api_handler >> Edge(label="write/read")   >> alerts_db
    api_handler >> Edge(label="read")         >> health_db
    api_handler >> Edge(label="scan result")  >> scans_db
    api_handler >> Edge(label="upload image") >> scan_s3

    # API handler → Bedrock (two-stage)
    api_handler >> Edge(label="Stage 1 triage")     >> haiku
    haiku       >> Edge(label="threat ≥ medium →")  >> sonnet
    api_handler >> Edge(label="disease scan")        >> sonnet

    # API handler → SNS
    api_handler >> Edge(label="publish alert") >> sns

    # Satellite pipeline
    sat_proc    >> Edge(label="NDVI query")           >> element84
    sat_proc    >> Edge(label="write healthScore")    >> health_db

    # Disease forecast pipeline
    disease_forecast >> Edge(label="weather data")   >> openmeteo
    disease_forecast >> Edge(label="read farms")     >> farms_db
    disease_forecast >> Edge(label="write forecast") >> alerts_db

    # Alert pipeline
    sns          >> Edge(label="trigger")           >> alert_sender
    alert_sender >> Edge(label="lookup phone")      >> farms_db
    alert_sender >> Edge(label="WhatsApp message")  >> twilio_wa
    twilio_wa    >> Edge(label="delivery")          >> farmer

print(f"Diagram saved to {output_path}.png")
