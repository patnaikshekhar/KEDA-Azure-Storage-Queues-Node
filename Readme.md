# KEDA Storage Queue Node.js Example

This is an example of using [KEDA](https://github.com/kedacore/keda) with storage queues in Nodejs.

KEDA (Kubernetes-based Event Driven Autoscaling) allows you to auto scale your kubernetes pods based on external metrics derived from systems such as RabbitMQ, Azure Storage Queues, Azure ServiceBus, etc. It also lets your scale the number of pods to zero so that you're not consuming resources when there is no processing to be done.

# Prerequisites
You need a Kubernetes cluster with KEDA installed. The [KEDA git hub repository](https://github.com/kedacore/keda) explains how this can be done using Helm.

# Tutorial

We'll start of by cloning this repository and creating a resource group and storage account

```sh
git clone https://github.com/patnaikshekhar/KEDA-Azure-Storage-Queues-Node
cd KEDA-Azure-Storage-Queues-Node

RESOURCE_GROUP=KedaSamples
LOCATION=eastus
STORAGE_ACCOUNT_NAME=kedastoragequeuetest

# Login to Azure
az login

# Create a Resource Group
az group create -n $RESOURCE_GROUP -l $LOCATION

# Create a Storage Account
az storage account create \
  -n $STORAGE_ACCOUNT_NAME \
  -g $RESOURCE_GROUP \
  -l $LOCATION \
  --sku Standard_LRS
```

Next we'll get the connection string for the storage account so that we can create a secret

```sh
CONNECTION_STRING=$(az storage account show-connection-string \
  -n $STORAGE_ACCOUNT_NAME \
  -g $RESOURCE_GROUP \
  --query="connectionString" \
  --output=tsv)
```

Now we can create the kubernetes namespace and the secret

```sh
# Create a new namespace
kubectl create namespace keda-storage-queue-sample

# Create a secret with the connection string
kubectl create secret generic keda-storage-queue-sample \
  --namespace=keda-storage-queue-sample \
  --from-literal=STORAGE_ACCOUNT_CONN_STRING=$CONNECTION_STRING
```

We shall now create the queue and deploy the kubernetes objects. We'll be creating a Deployment and a ScaledObject. The deployment is for a simple node js app which deueues a message from a storage queue and then writes it to standard out. The scaled object is a CRD used by KEDA to determine which deployment to scale and using which metrics. In this case we're looking at the queue length as the metric.

```sh
# Create the queue
QUEUE_NAME=keda-test

az storage queue create \
  --name $QUEUE_NAME \
  --account-name $STORAGE_ACCOUNT_NAME

# Deploy the kubernetes objects
kubectl apply -f manifests/
```

We can now open a terminal window to start monitoring the pods. You should see no pods started at this point.

```sh
kubectl get pods -n keda-storage-queue-sample -w
```

Now that the queue is created we're ready to test by placing messages into the queue. Run the following commands to place 20 messages into the queue

```sh
for x in {1..10}
do
az storage message put \
  --content="Test Message ${x}" \
  --queue-name $QUEUE_NAME \
  --account-name=$STORAGE_ACCOUNT_NAME
done
```

You should now see pods automatically spinning up to process the message. Once all the messages have been processed you would be able to see the pods getting terminated.
